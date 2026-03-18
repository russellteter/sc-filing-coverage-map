#!/usr/bin/env python3
"""
Generate candidates.json from VREMS monitor state.json.

Reads the local VREMS filing monitor's state.json (which already contains
all 144+ active SC House candidates with metadata) and produces
candidates.json in the format the SC Filing Coverage Map expects.

No external dependencies — stdlib only.

Usage:
  python scripts/generate-from-vrems.py [--vrems-state PATH]
"""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
SRC_DATA_DIR = PROJECT_ROOT / "src" / "data"
PUBLIC_DATA_DIR = PROJECT_ROOT / "public" / "data"
PARTY_DATA_FILE = SRC_DATA_DIR / "party-data.json"

DEFAULT_VREMS_STATE = Path.home() / "Desktop" / "sc-vrems-filing-monitor" / "state.json"

TOTAL_HOUSE_DISTRICTS = 124


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def extract_district_number(district_str: str) -> int | None:
    """Extract district number from strings like '006', 'District 42', etc."""
    if not district_str:
        return None
    match = re.search(r"(\d+)", str(district_str).strip())
    if match:
        num = int(match.group(1))
        if 1 <= num <= TOTAL_HOUSE_DISTRICTS:
            return num
    return None


def normalize_name_parts(name: str) -> tuple[str, str]:
    """Return (first_lower, last_lower) from a full name string."""
    parts = name.strip().split()
    if len(parts) < 2:
        return (parts[0].lower() if parts else "", "")
    return (parts[0].lower(), parts[-1].lower())


def load_incumbents() -> dict:
    """Load incumbent data from party-data.json. Returns {district_num_str: {name, party}}."""
    if not PARTY_DATA_FILE.exists():
        print(f"  Warning: {PARTY_DATA_FILE} not found — skipping incumbent matching")
        return {}
    with open(PARTY_DATA_FILE) as f:
        data = json.load(f)
    return data.get("incumbents", {}).get("house", {})


def is_incumbent(candidate_name: str, district_num: int, incumbents: dict) -> bool:
    """Check if candidate matches the incumbent for their district."""
    district_key = str(district_num)
    if district_key not in incumbents:
        return False

    incumbent = incumbents[district_key]
    incumbent_name = incumbent.get("name", "")

    cand_first, cand_last = normalize_name_parts(candidate_name)
    inc_first, inc_last = normalize_name_parts(incumbent_name)

    if not cand_last or not inc_last:
        return False

    # Last names must match
    if cand_last != inc_last:
        return False

    # First name or initial match
    if cand_first and inc_first:
        if cand_first == inc_first or cand_first[0] == inc_first[0]:
            return True

    # Last name alone is sufficient (rare collisions at district level)
    return True


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def build_candidates_json(vrems_state: dict, incumbents: dict) -> dict:
    """Build candidates.json from VREMS state.json candidates_metadata."""
    now = datetime.now(timezone.utc).isoformat()

    # Initialize all 124 house districts
    house = {}
    for d in range(1, TOTAL_HOUSE_DISTRICTS + 1):
        dist_key = str(d)
        incumbent_info = incumbents.get(dist_key)
        house[dist_key] = {
            "districtNumber": d,
            "candidates": [],
            "incumbent": incumbent_info if incumbent_info else None,
        }

    # Empty senate (app expects both keys)
    senate = {}

    metadata = vrems_state.get("candidates_metadata", {})
    candidates_added = 0
    per_district_idx = {}  # track per-district index for reportId

    for _key, entry in metadata.items():
        district_str = entry.get("district", "")
        district_num = extract_district_number(district_str)
        if district_num is None:
            continue

        dist_key = str(district_num)
        idx = per_district_idx.get(dist_key, 0)
        per_district_idx[dist_key] = idx + 1

        candidate = {
            "name": entry.get("full_name", ""),
            "party": entry.get("party"),
            "status": "filed",
            "filedDate": entry.get("date_filed"),
            "ethicsUrl": None,
            "reportId": f"vrems-{district_num}-{idx}",
            "source": "vrems",
            "isIncumbent": is_incumbent(
                entry.get("full_name", ""), district_num, incumbents
            ),
        }

        # Add contact info if available from VREMS data
        contact_email = entry.get("email") or entry.get("contact_email")
        contact_phone = entry.get("phone") or entry.get("contact_phone")
        if contact_email:
            candidate["contactEmail"] = contact_email
        if contact_phone:
            candidate["contactPhone"] = contact_phone

        house[dist_key]["candidates"].append(candidate)
        candidates_added += 1

    return {
        "lastUpdated": now,
        "house": house,
        "senate": senate,
    }, candidates_added


def print_summary(data: dict, total_added: int):
    """Print summary statistics."""
    house = data["house"]
    dem_count = 0
    rep_count = 0
    other_count = 0
    incumbent_count = 0
    districts_with_candidates = 0
    dem_districts = set()
    rep_districts = set()

    for dist_key, district in house.items():
        if district["candidates"]:
            districts_with_candidates += 1
        for c in district["candidates"]:
            party = (c.get("party") or "").lower()
            if party == "democratic":
                dem_count += 1
                dem_districts.add(dist_key)
            elif party == "republican":
                rep_count += 1
                rep_districts.add(dist_key)
            else:
                other_count += 1
            if c.get("isIncumbent"):
                incumbent_count += 1

    print(f"\n=== Summary ===")
    print(f"Total candidates added: {total_added}")
    print(f"Districts with candidates: {districts_with_candidates} / {TOTAL_HOUSE_DISTRICTS}")
    print(f"  Democrats:   {dem_count} candidates in {len(dem_districts)} districts")
    print(f"  Republicans: {rep_count} candidates in {len(rep_districts)} districts")
    print(f"  Other:       {other_count}")
    print(f"  Incumbents matched: {incumbent_count}")


def main():
    # Parse CLI args
    vrems_path = DEFAULT_VREMS_STATE
    for i, arg in enumerate(sys.argv[1:], 1):
        if arg == "--vrems-state" and i < len(sys.argv) - 1:
            vrems_path = Path(sys.argv[i + 1])

    print(f"=== VREMS → candidates.json Generator ===")
    print(f"VREMS state: {vrems_path}")

    if not vrems_path.exists():
        print(f"ERROR: VREMS state file not found: {vrems_path}")
        sys.exit(1)

    # Load inputs
    with open(vrems_path) as f:
        vrems_state = json.load(f)

    metadata = vrems_state.get("candidates_metadata", {})
    print(f"VREMS candidates found: {len(metadata)}")

    incumbents = load_incumbents()
    print(f"Incumbents loaded: {len(incumbents)}")

    # Build output
    candidates_data, total_added = build_candidates_json(vrems_state, incumbents)

    # Write to both src/data and public/data
    for output_dir in [SRC_DATA_DIR, PUBLIC_DATA_DIR]:
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / "candidates.json"
        with open(output_path, "w") as f:
            json.dump(candidates_data, f, indent=2)
        print(f"Wrote: {output_path}")

    print_summary(candidates_data, total_added)
    print("\nDone!")


if __name__ == "__main__":
    main()
