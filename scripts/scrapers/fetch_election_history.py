#!/usr/bin/env python3
"""
Fetch historical election results from SC Election Commission API.

Downloads CSV data from https://sc.elstats.civera.com/api/download_search.csv
for House and Senate races across 2020, 2022, and 2024 election years.

Output: public/data/elections.json
"""

import csv
import json
import logging
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
PUBLIC_DATA_DIR = PROJECT_ROOT / "public" / "data"
SRC_DATA_DIR = PROJECT_ROOT / "src" / "data"
OUTPUT_FILE = PUBLIC_DATA_DIR / "elections.json"

# SC Election History Database API
BASE_URL = "https://sc.elstats.civera.com/api/download_search.csv"

# Office IDs from the database (found via electionhistory.scvotes.gov UI)
OFFICE_IDS = {
    "house": 599,   # State House (124 districts)
    "senate": 5     # State Senate (46 districts)
}

# Election years to fetch
ELECTION_YEARS = [2020, 2022, 2024]

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 2
REQUEST_TIMEOUT_SECONDS = 120


class ElectionHistoryScraper:
    """Scrapes election history data from SC Election Commission API."""

    def __init__(self):
        self.session_headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) SC-Election-Map/2.0",
            "Accept": "text/csv,application/csv,text/plain,*/*",
            "Accept-Language": "en-US,en;q=0.9",
        }

    def build_search_url(self, office_id: int, from_year: int, to_year: int) -> str:
        """Build the CSV download URL for a given office and year range."""
        search_params = {
            "global": {
                "years": {
                    "from": from_year,
                    "to": to_year
                }
            },
            "contests": {
                "candidates": [],
                "divisions": [],
                "offices": [{"id": office_id}]
            },
            "specialElectionsOnly": False,
            "voterStats": False,
            "stages": []
        }

        encoded = urllib.parse.quote(json.dumps(search_params, separators=(",", ":")))
        return f"{BASE_URL}?search={encoded}"

    def download_csv_with_retry(self, url: str) -> list[dict]:
        """
        Download and parse CSV from URL with retry logic.

        Args:
            url: The URL to download from

        Returns:
            List of dictionaries representing CSV rows

        Raises:
            Exception: If all retries fail
        """
        last_error = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                logger.info(f"Attempt {attempt}/{MAX_RETRIES}: Downloading from API...")

                req = urllib.request.Request(url, headers=self.session_headers)

                with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                    content = response.read().decode("utf-8")

                lines = content.strip().split("\n")
                if len(lines) < 2:
                    raise ValueError("CSV response has no data rows")

                reader = csv.DictReader(lines)
                rows = list(reader)

                logger.info(f"Successfully downloaded {len(rows)} rows")
                return rows

            except urllib.error.HTTPError as e:
                last_error = e
                logger.warning(f"HTTP error {e.code}: {e.reason}")

            except urllib.error.URLError as e:
                last_error = e
                logger.warning(f"URL error: {e.reason}")

            except TimeoutError:
                last_error = TimeoutError("Request timed out")
                logger.warning("Request timed out")

            except Exception as e:
                last_error = e
                logger.warning(f"Unexpected error: {e}")

            if attempt < MAX_RETRIES:
                delay = RETRY_DELAY_SECONDS * attempt
                logger.info(f"Retrying in {delay} seconds...")
                time.sleep(delay)

        raise Exception(f"Failed after {MAX_RETRIES} attempts. Last error: {last_error}")

    def process_results(self, rows: list[dict], chamber: str) -> dict[str, Any]:
        """
        Process CSV rows into election results by district.

        Args:
            rows: CSV data rows from the API
            chamber: 'house' or 'senate'

        Returns:
            Dict mapping district number (str) to election results
        """
        # Structure: {district_num: {year: {(candidate_name, party): candidate_data}}}
        district_data = defaultdict(lambda: defaultdict(dict))

        for row in rows:
            # Filter to General elections only (skip primaries, runoffs)
            if row.get("election_type") != "General":
                continue

            # Filter to County-level data (aggregate, not precinct-level)
            if row.get("division_type") != "County":
                continue

            # Skip metadata rows
            candidate_name = row.get("candidate_name", "").strip()
            if candidate_name in ("Write-In", "Total Votes Cast", "Total Ballots Cast", "Overvotes/Undervotes", ""):
                continue

            # Extract year from election_date (format: YYYY-MM-DD)
            election_date = row.get("election_date", "")
            if not election_date:
                continue
            year = election_date[:4]

            # Extract district number
            district_name = row.get("district_name", "").strip()
            if not district_name.isdigit():
                continue
            district_num = int(district_name)

            # Get party and votes
            party = row.get("candidate_party_name", "").strip()
            try:
                votes = int(row.get("votes", 0) or 0)
            except (ValueError, TypeError):
                votes = 0

            is_winner = row.get("is_winner", "").lower() == "true"

            # Accumulate votes for this candidate (data is per-county, need to sum)
            key = (candidate_name, party)
            if key not in district_data[district_num][year]:
                district_data[district_num][year][key] = {
                    "name": candidate_name,
                    "party": party,
                    "votes": 0,
                    "is_winner": is_winner
                }

            district_data[district_num][year][key]["votes"] += votes

            # Update is_winner (True if any row says True)
            if is_winner:
                district_data[district_num][year][key]["is_winner"] = True

        # Convert to final structure with sorted candidates
        results = {}

        for district_num, years in district_data.items():
            district_results = {
                "districtNumber": district_num,
                "elections": {}
            }

            for year, candidates in years.items():
                # Sort candidates by votes (descending)
                sorted_candidates = sorted(
                    candidates.values(),
                    key=lambda x: x["votes"],
                    reverse=True
                )

                if not sorted_candidates:
                    continue

                # Calculate total votes and percentages
                total_votes = sum(c["votes"] for c in sorted_candidates)

                winner = sorted_candidates[0]
                runner_up = sorted_candidates[1] if len(sorted_candidates) > 1 else None

                winner_pct = round(winner["votes"] / total_votes * 100, 1) if total_votes > 0 else 0

                election_result = {
                    "year": int(year),
                    "totalVotes": total_votes,
                    "winner": {
                        "name": winner["name"],
                        "party": winner["party"],
                        "votes": winner["votes"],
                        "percentage": winner_pct
                    }
                }

                if runner_up and runner_up["votes"] > 0:
                    runner_up_pct = round(runner_up["votes"] / total_votes * 100, 1) if total_votes > 0 else 0
                    election_result["runnerUp"] = {
                        "name": runner_up["name"],
                        "party": runner_up["party"],
                        "votes": runner_up["votes"],
                        "percentage": runner_up_pct
                    }
                    election_result["margin"] = round(winner_pct - runner_up_pct, 1)
                    election_result["marginVotes"] = winner["votes"] - runner_up["votes"]

                    # Calculate margin as fraction for schema compatibility
                    election_result["dem_pct"] = None
                    election_result["rep_pct"] = None

                    for candidate in [winner, runner_up]:
                        pct = round(candidate["votes"] / total_votes, 4) if total_votes > 0 else 0
                        if candidate["party"] == "Democratic":
                            election_result["dem_pct"] = pct
                        elif candidate["party"] == "Republican":
                            election_result["rep_pct"] = pct
                else:
                    # Uncontested race
                    election_result["margin"] = 100.0
                    election_result["marginVotes"] = winner["votes"]
                    election_result["uncontested"] = True

                    # Set party percentages for uncontested
                    if winner["party"] == "Democratic":
                        election_result["dem_pct"] = 1.0
                        election_result["rep_pct"] = 0.0
                    elif winner["party"] == "Republican":
                        election_result["dem_pct"] = 0.0
                        election_result["rep_pct"] = 1.0

                district_results["elections"][year] = election_result

            # Calculate competitiveness score
            district_results["competitiveness"] = self._calculate_competitiveness(
                district_results["elections"]
            )

            results[str(district_num)] = district_results

        return results

    def _calculate_competitiveness(self, elections: dict) -> dict:
        """
        Calculate competitiveness metrics for a district.

        Considers:
        - Average margin over recent elections
        - Whether district has flipped parties
        - Presence of contested races
        """
        margins = []
        parties_won = set()
        contested_count = 0

        # Look at recent elections (2024, 2022, 2020)
        for year in ["2024", "2022", "2020"]:
            if year not in elections:
                continue

            election = elections[year]

            if not election.get("uncontested", False):
                contested_count += 1
                margins.append(election.get("margin", 100))

            winner_party = election.get("winner", {}).get("party", "")
            if winner_party:
                parties_won.add(winner_party)

        # Calculate average margin (only contested races)
        avg_margin = sum(margins) / len(margins) if margins else 100.0

        # Has the district swung between parties?
        has_swung = len(parties_won) > 1

        # Calculate competitiveness score (100 = most competitive)
        if avg_margin <= 5:
            base_score = 95
        elif avg_margin <= 10:
            base_score = 80
        elif avg_margin <= 15:
            base_score = 60
        elif avg_margin <= 20:
            base_score = 40
        elif avg_margin <= 30:
            base_score = 20
        else:
            base_score = 10

        # Bonus for swing districts
        if has_swung:
            base_score = min(100, base_score + 10)

        # Reduce score if mostly uncontested
        if contested_count == 0:
            base_score = 5
        elif contested_count == 1:
            base_score = max(5, base_score - 20)

        return {
            "score": base_score,
            "avgMargin": round(avg_margin, 1),
            "hasSwung": has_swung,
            "contestedRaces": contested_count,
            "dominantParty": list(parties_won)[0] if len(parties_won) == 1 else None
        }

    def fetch_all(self) -> dict[str, Any]:
        """
        Fetch election data for all chambers and years.

        Returns:
            Complete elections data structure
        """
        output = {
            "lastUpdated": datetime.now(timezone.utc).isoformat() + "Z",
            "source": "SC Election Commission - electionhistory.scvotes.gov",
            "years": ELECTION_YEARS,
            "house": {},
            "senate": {}
        }

        for chamber, office_id in OFFICE_IDS.items():
            logger.info(f"Fetching {chamber.upper()} election results...")

            url = self.build_search_url(
                office_id=office_id,
                from_year=min(ELECTION_YEARS),
                to_year=max(ELECTION_YEARS)
            )

            try:
                rows = self.download_csv_with_retry(url)
                logger.info(f"  Downloaded {len(rows)} rows for {chamber}")

                results = self.process_results(rows, chamber)
                output[chamber] = results

                logger.info(f"  Processed {len(results)} {chamber} districts")

            except Exception as e:
                logger.error(f"Failed to fetch {chamber} data: {e}")
                raise

        return output

    def generate_summary(self, data: dict) -> None:
        """Print summary statistics for the fetched data."""
        logger.info("=" * 60)
        logger.info("ELECTION DATA SUMMARY")
        logger.info("=" * 60)

        for chamber in ["house", "senate"]:
            chamber_data = data.get(chamber, {})
            total_districts = len(chamber_data)

            competitive_count = sum(
                1 for d in chamber_data.values()
                if d.get("competitiveness", {}).get("score", 0) >= 60
            )

            swing_count = sum(
                1 for d in chamber_data.values()
                if d.get("competitiveness", {}).get("hasSwung", False)
            )

            dem_dominant = sum(
                1 for d in chamber_data.values()
                if d.get("competitiveness", {}).get("dominantParty") == "Democratic"
            )

            rep_dominant = sum(
                1 for d in chamber_data.values()
                if d.get("competitiveness", {}).get("dominantParty") == "Republican"
            )

            logger.info(f"\n{chamber.upper()}:")
            logger.info(f"  Total districts: {total_districts}")
            logger.info(f"  Competitive (score >= 60): {competitive_count}")
            logger.info(f"  Swing districts: {swing_count}")
            logger.info(f"  Democratic dominant: {dem_dominant}")
            logger.info(f"  Republican dominant: {rep_dominant}")


def main() -> int:
    """Main entry point."""
    logger.info("SC Election History Scraper")
    logger.info("=" * 60)

    scraper = ElectionHistoryScraper()

    try:
        # Fetch all election data
        data = scraper.fetch_all()

        # Ensure output directory exists
        OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

        # Write to public/data/elections.json
        with open(OUTPUT_FILE, "w") as f:
            json.dump(data, f, indent=2)
        logger.info(f"\nOutput written to: {OUTPUT_FILE}")

        # Also write to src/data/elections.json for consistency
        SRC_DATA_DIR.mkdir(parents=True, exist_ok=True)
        src_output = SRC_DATA_DIR / "elections.json"
        with open(src_output, "w") as f:
            json.dump(data, f, indent=2)
        logger.info(f"Also written to: {src_output}")

        # Print summary
        scraper.generate_summary(data)

        logger.info("\nScraper completed successfully!")
        return 0

    except Exception as e:
        logger.error(f"Scraper failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
