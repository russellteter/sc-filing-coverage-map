#!/usr/bin/env python3
"""
Generate candidates.json and coverage-summary.json from VREMS Google Sheet.

Reads the Candidates tab from the VREMS ballot filing Google Sheet and
produces data files in the format the SC Filing Coverage Map expects.

Environment variables:
  GOOGLE_SHEET_ID           - Google Sheet ID (default: VREMS sheet)
  GOOGLE_SHEETS_CREDENTIALS - Base64-encoded service account JSON

Usage:
  python scripts/generate-vrems-data.py
"""

import base64
import json
import os
import re
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

try:
    import gspread
    from google.oauth2.service_account import Credentials
except ImportError:
    print("ERROR: Missing dependencies. Run: pip install gspread google-auth")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_DIR = PROJECT_ROOT / "public" / "data"

DEFAULT_SHEET_ID = "1_SztBdJyl4FoPrtPiduKvrrnttisZDAJRLiHeoyFxLY"

# Expected column headers in the Candidates tab (case-insensitive matching)
# We search for these patterns in the header row to be flexible
COLUMN_PATTERNS = {
    "name": r"(candidate|name)",
    "party": r"party",
    "district": r"district",
    "status": r"status",
    "filed_date": r"(filed|date)",
    "office": r"office",
    "chamber": r"(chamber|body)",
}

TOTAL_HOUSE_DISTRICTS = 124


def get_google_client():
    """Authenticate with Google Sheets API using service account credentials."""
    creds_b64 = os.environ.get("GOOGLE_SHEETS_CREDENTIALS")
    if not creds_b64:
        print("ERROR: GOOGLE_SHEETS_CREDENTIALS environment variable not set")
        sys.exit(1)

    try:
        creds_json = base64.b64decode(creds_b64)
        creds_data = json.loads(creds_json)
    except Exception as e:
        print(f"ERROR: Failed to decode credentials: {e}")
        sys.exit(1)

    # Write credentials to temp file for gspread
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(creds_data, f)
        creds_path = f.name

    try:
        scopes = [
            "https://www.googleapis.com/auth/spreadsheets.readonly",
            "https://www.googleapis.com/auth/drive.readonly",
        ]
        credentials = Credentials.from_service_account_file(creds_path, scopes=scopes)
        client = gspread.authorize(credentials)
        return client
    finally:
        os.unlink(creds_path)


def find_column_index(headers, pattern_key):
    """Find a column index by matching header text against a regex pattern."""
    pattern = COLUMN_PATTERNS.get(pattern_key, pattern_key)
    for i, header in enumerate(headers):
        if re.search(pattern, header.strip(), re.IGNORECASE):
            return i
    return None


def extract_district_number(text):
    """Extract a district number from a string like 'District 42' or 'HD-42' or just '42'."""
    if not text:
        return None
    match = re.search(r"(\d+)", str(text).strip())
    if match:
        num = int(match.group(1))
        if 1 <= num <= TOTAL_HOUSE_DISTRICTS:
            return num
    return None


def normalize_party(party_str):
    """Normalize party string to standard format."""
    if not party_str:
        return None
    p = party_str.strip().lower()
    if p in ("d", "dem", "democrat", "democratic"):
        return "Democratic"
    if p in ("r", "rep", "republican"):
        return "Republican"
    if p in ("i", "ind", "independent"):
        return "Independent"
    if p in ("g", "green"):
        return "Green"
    if p in ("l", "lib", "libertarian"):
        return "Libertarian"
    # Return original if unrecognized
    return party_str.strip() or None


def is_house_candidate(row_data, col_indices):
    """Determine if a row represents an SC House candidate."""
    # Check chamber column if available
    chamber_idx = col_indices.get("chamber")
    if chamber_idx is not None and chamber_idx < len(row_data):
        chamber_val = str(row_data[chamber_idx]).strip().lower()
        if "senate" in chamber_val:
            return False
        if "house" in chamber_val:
            return True

    # Check office column if available
    office_idx = col_indices.get("office")
    if office_idx is not None and office_idx < len(row_data):
        office_val = str(row_data[office_idx]).strip().lower()
        if "senate" in office_val:
            return False
        if "house" in office_val:
            return True

    # Default: assume House if district is in valid range
    return True


def read_vrems_sheet(client, sheet_id):
    """Read candidate data from the VREMS Google Sheet."""
    print(f"Opening sheet: {sheet_id}")
    spreadsheet = client.open_by_key(sheet_id)

    # Try to find the Candidates tab
    worksheet = None
    for ws in spreadsheet.worksheets():
        title_lower = ws.title.lower()
        if "candidate" in title_lower:
            worksheet = ws
            print(f"Found candidates tab: '{ws.title}'")
            break

    if worksheet is None:
        # Fall back to first worksheet
        worksheet = spreadsheet.sheet1
        print(f"Using first worksheet: '{worksheet.title}'")

    all_rows = worksheet.get_all_values()
    if not all_rows:
        print("ERROR: Sheet is empty")
        sys.exit(1)

    # Find header row (first row with recognizable column names)
    headers = all_rows[0]
    data_rows = all_rows[1:]

    print(f"Headers: {headers}")
    print(f"Data rows: {len(data_rows)}")

    # Map columns
    col_indices = {}
    for key in COLUMN_PATTERNS:
        idx = find_column_index(headers, key)
        if idx is not None:
            col_indices[key] = idx
            print(f"  Column '{key}' -> index {idx} ('{headers[idx]}')")

    if "name" not in col_indices:
        print("ERROR: Could not find a 'name' or 'candidate' column")
        sys.exit(1)

    if "district" not in col_indices:
        print("ERROR: Could not find a 'district' column")
        sys.exit(1)

    return data_rows, col_indices


def build_candidates_json(data_rows, col_indices):
    """Build candidates.json in the format expected by the map app."""
    now = datetime.now(timezone.utc).isoformat()

    # Initialize all 124 house districts
    house = {}
    for d in range(1, TOTAL_HOUSE_DISTRICTS + 1):
        house[str(d)] = {
            "districtNumber": d,
            "candidates": [],
            "incumbent": None,
        }

    # Also initialize empty senate (the app expects both)
    senate = {}

    # Process each row
    candidates_added = 0
    for row in data_rows:
        # Skip empty rows
        name_idx = col_indices["name"]
        if name_idx >= len(row) or not row[name_idx].strip():
            continue

        # Skip non-House candidates
        if not is_house_candidate(row, col_indices):
            continue

        # Extract district number
        dist_idx = col_indices["district"]
        if dist_idx >= len(row):
            continue
        district_num = extract_district_number(row[dist_idx])
        if district_num is None:
            continue

        # Build candidate object
        name = row[name_idx].strip()
        party = None
        filed_date = None
        status = "filed"

        if "party" in col_indices and col_indices["party"] < len(row):
            party = normalize_party(row[col_indices["party"]])

        if "filed_date" in col_indices and col_indices["filed_date"] < len(row):
            date_str = row[col_indices["filed_date"]].strip()
            if date_str:
                # Try common date formats
                for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%m-%d-%Y"):
                    try:
                        dt = datetime.strptime(date_str, fmt)
                        filed_date = dt.strftime("%Y-%m-%d")
                        break
                    except ValueError:
                        continue
                if filed_date is None:
                    filed_date = date_str  # Keep original if can't parse

        if "status" in col_indices and col_indices["status"] < len(row):
            raw_status = row[col_indices["status"]].strip().lower()
            if raw_status:
                status = raw_status

        candidate = {
            "name": name,
            "party": party,
            "status": status,
            "filedDate": filed_date,
            "ethicsUrl": None,
            "reportId": f"vrems-{district_num}-{candidates_added}",
            "source": "vrems",
            "isIncumbent": False,
        }

        dist_key = str(district_num)
        if dist_key in house:
            house[dist_key]["candidates"].append(candidate)
            candidates_added += 1

    print(f"Added {candidates_added} candidates to {TOTAL_HOUSE_DISTRICTS} districts")

    return {
        "lastUpdated": now,
        "house": house,
        "senate": senate,
    }


def build_coverage_summary(candidates_data):
    """Build coverage-summary.json with aggregate stats."""
    now = datetime.now(timezone.utc).isoformat()
    house = candidates_data["house"]

    dem_candidates = 0
    dem_districts = set()
    rep_candidates = 0
    rep_districts = set()
    dem_primary_districts = set()

    for dist_key, district in house.items():
        dem_count = 0
        rep_count = 0

        for candidate in district["candidates"]:
            party = (candidate.get("party") or "").lower()
            if party in ("democratic", "democrat"):
                dem_candidates += 1
                dem_count += 1
                dem_districts.add(dist_key)
            elif party in ("republican",):
                rep_candidates += 1
                rep_count += 1
                rep_districts.add(dist_key)

        if dem_count >= 2:
            dem_primary_districts.add(dist_key)

    filed_districts = dem_districts | rep_districts
    unfiled = TOTAL_HOUSE_DISTRICTS - len(filed_districts)

    summary = {
        "lastUpdated": now,
        "demCandidates": dem_candidates,
        "demDistricts": len(dem_districts),
        "repCandidates": rep_candidates,
        "repDistricts": len(rep_districts),
        "unfiledDistricts": unfiled,
        "demPrimaries": len(dem_primary_districts),
    }

    print(f"Coverage summary:")
    print(f"  Dem: {dem_candidates} candidates in {len(dem_districts)} districts")
    print(f"  Rep: {rep_candidates} candidates in {len(rep_districts)} districts")
    print(f"  Unfiled: {unfiled} districts")
    print(f"  Dem primaries: {len(dem_primary_districts)} districts")

    return summary


def main():
    sheet_id = os.environ.get("GOOGLE_SHEET_ID", DEFAULT_SHEET_ID)

    print("=== VREMS Data Generator ===")
    print(f"Sheet ID: {sheet_id}")
    print(f"Output dir: {OUTPUT_DIR}")

    # Authenticate and read sheet
    client = get_google_client()
    data_rows, col_indices = read_vrems_sheet(client, sheet_id)

    # Build output data
    candidates_data = build_candidates_json(data_rows, col_indices)
    coverage_summary = build_coverage_summary(candidates_data)

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Write candidates.json
    candidates_path = OUTPUT_DIR / "candidates.json"
    with open(candidates_path, "w") as f:
        json.dump(candidates_data, f, indent=2)
    print(f"Wrote {candidates_path}")

    # Write coverage-summary.json
    summary_path = OUTPUT_DIR / "coverage-summary.json"
    with open(summary_path, "w") as f:
        json.dump(coverage_summary, f, indent=2)
    print(f"Wrote {summary_path}")

    print("Done!")


if __name__ == "__main__":
    main()
