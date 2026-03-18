#!/usr/bin/env python3
"""
Fetch current incumbent data from SC State House website.

Scrapes https://www.scstatehouse.gov/member.php?chamber=H for House members
and https://www.scstatehouse.gov/member.php?chamber=S for Senate members.

Output: public/data/incumbents.json
"""

import json
import logging
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
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
OUTPUT_FILE = PUBLIC_DATA_DIR / "incumbents.json"

# SC State House URLs
HOUSE_MEMBERS_URL = "https://www.scstatehouse.gov/member.php?chamber=H"
SENATE_MEMBERS_URL = "https://www.scstatehouse.gov/member.php?chamber=S"

# Request configuration
REQUEST_TIMEOUT_SECONDS = 60
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 2


@dataclass
class Incumbent:
    """Represents an incumbent legislator."""
    name: str
    party: str
    district: int
    url: str | None = None
    photo_url: str | None = None
    email: str | None = None


class MemberTableParser(HTMLParser):
    """
    HTML parser to extract member data from SC State House member tables.

    The website uses a table-based layout with member cards containing:
    - Photo link
    - Name (linked to member detail page)
    - Party in parentheses
    - District number
    """

    def __init__(self):
        super().__init__()
        self.members: list[dict] = []
        self.current_member: dict = {}
        self.in_member_row = False
        self.in_member_link = False
        self.in_district_cell = False
        self.capture_text = False
        self.current_text = ""

        # Track table structure
        self.in_table = False
        self.in_td = False
        self.td_count = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]):
        attrs_dict = dict(attrs)

        if tag == "table":
            self.in_table = True

        elif tag == "tr" and self.in_table:
            self.in_member_row = True
            self.current_member = {}
            self.td_count = 0

        elif tag == "td" and self.in_member_row:
            self.in_td = True
            self.td_count += 1

        elif tag == "a" and self.in_td:
            href = attrs_dict.get("href", "")

            # Member detail page link
            if "member.php?code=" in href:
                self.in_member_link = True
                self.capture_text = True
                self.current_text = ""

                # Build full URL
                if not href.startswith("http"):
                    href = f"https://www.scstatehouse.gov/{href}"
                self.current_member["url"] = href

            # Photo image link
            elif "/images/members/" in href or "/member.php" in href:
                img_src = attrs_dict.get("src", "")
                if img_src:
                    self.current_member["photo_url"] = img_src

        elif tag == "img" and self.in_td:
            src = attrs_dict.get("src", "")
            if "/images/members/" in src:
                if not src.startswith("http"):
                    src = f"https://www.scstatehouse.gov{src}"
                self.current_member["photo_url"] = src

    def handle_endtag(self, tag: str):
        if tag == "table":
            self.in_table = False

        elif tag == "tr" and self.in_member_row:
            # End of member row - save if we have data
            if self.current_member.get("name"):
                self.members.append(self.current_member.copy())
            self.in_member_row = False
            self.current_member = {}

        elif tag == "td":
            self.in_td = False

        elif tag == "a" and self.in_member_link:
            self.in_member_link = False
            self.capture_text = False

            # Parse the captured text for name and party
            text = self.current_text.strip()
            if text:
                self._parse_member_name(text)

    def handle_data(self, data: str):
        if self.capture_text:
            self.current_text += data

        elif self.in_td and self.in_member_row:
            # Look for district number pattern
            text = data.strip()

            # Match "District X" or just a number
            district_match = re.search(r"(?:District\s*)?(\d+)", text, re.IGNORECASE)
            if district_match and "district" not in self.current_member:
                try:
                    district = int(district_match.group(1))
                    if 1 <= district <= 124:  # Valid House district range
                        self.current_member["district"] = district
                except ValueError:
                    pass

    def _parse_member_name(self, text: str):
        """
        Parse member name and party from text like:
        "John Smith (R)" or "Jane Doe (D)"
        """
        # Match pattern: Name (Party)
        match = re.match(r"(.+?)\s*\(([RD])\)\s*$", text)
        if match:
            name = match.group(1).strip()
            party_abbr = match.group(2)

            self.current_member["name"] = name
            self.current_member["party"] = "Republican" if party_abbr == "R" else "Democratic"
        else:
            # No party in parentheses, just use the name
            self.current_member["name"] = text.strip()


class IncumbentsScraper:
    """Scrapes incumbent data from SC State House website."""

    def __init__(self):
        self.session_headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 SC-Election-Map/2.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

    def fetch_page_with_retry(self, url: str) -> str:
        """
        Fetch HTML page with retry logic.

        Args:
            url: URL to fetch

        Returns:
            HTML content as string

        Raises:
            Exception: If all retries fail
        """
        last_error = None

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                logger.info(f"Attempt {attempt}/{MAX_RETRIES}: Fetching {url}")

                req = urllib.request.Request(url, headers=self.session_headers)

                with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                    # Handle potential encoding issues
                    content_type = response.headers.get("Content-Type", "")
                    encoding = "utf-8"

                    if "charset=" in content_type:
                        charset_match = re.search(r"charset=([^\s;]+)", content_type)
                        if charset_match:
                            encoding = charset_match.group(1)

                    content = response.read().decode(encoding, errors="replace")

                logger.info(f"Successfully fetched {len(content)} bytes")
                return content

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

    def parse_members_page(self, html: str, chamber: str) -> list[dict]:
        """
        Parse members page HTML using regex patterns.

        The SC State House website structure (as of 2026):
        - Members are in div.memberOutline containers
        - div.district contains <h1><a>District X</a></h1>
        - a.membername contains "Representative/Senator Name"
        - Party (D) or (R) appears right after the membername link

        Args:
            html: HTML content of the members page
            chamber: 'house' or 'senate'

        Returns:
            List of member dictionaries
        """
        members = []

        # Pattern to match the entire member block structure:
        # <div class="district"><h1><a href="...">District XX</a></h1></div>
        # ... <a class="membername" href="...">Representative Name</a>(D)
        member_block_pattern = re.compile(
            r'<div\s+class="district">\s*<h1>\s*<a\s+href="/member\.php\?code=(\d+)">'
            r'District\s+(\d+)</a>\s*</h1>\s*</div>'
            r'.*?'
            r'<a\s+class="membername"\s+href="/member\.php\?code=\1">'
            r'(?:Representative|Senator)\s+([^<]+)</a>\s*'
            r'\(([RD])\)',
            re.IGNORECASE | re.DOTALL
        )

        for match in member_block_pattern.finditer(html):
            member_code = match.group(1)
            district = int(match.group(2))
            name = match.group(3).strip()
            party_abbr = match.group(4).upper()

            max_district = 124 if chamber == "house" else 46
            if 1 <= district <= max_district:
                members.append({
                    "name": name,
                    "party": "Republican" if party_abbr == "R" else "Democratic",
                    "district": district,
                    "code": member_code,
                    "url": f"https://www.scstatehouse.gov/member.php?code={member_code}"
                })

        return members

    def parse_members_alternate(self, html: str, chamber: str) -> list[dict]:
        """
        Alternative parsing method - simpler two-step pattern matching.

        Used as fallback if the primary method returns too few results.
        Extracts memberOutline blocks and parses each one individually.
        """
        members = []

        # Split by memberOutline divs to get individual member blocks
        # Pattern: <div class="memberOutline">...</div>
        block_pattern = re.compile(
            r'<div\s+class="memberOutline">(.*?)</div>\s*(?=<div\s+class="memberOutline">|$)',
            re.IGNORECASE | re.DOTALL
        )

        for block_match in block_pattern.finditer(html):
            block_html = block_match.group(1)

            # Extract district number
            district_match = re.search(
                r'<div\s+class="district">\s*<h1>\s*<a[^>]+>District\s+(\d+)</a>',
                block_html,
                re.IGNORECASE
            )
            if not district_match:
                continue

            try:
                district = int(district_match.group(1))
            except ValueError:
                continue

            max_district = 124 if chamber == "house" else 46
            if not (1 <= district <= max_district):
                continue

            # Extract member name and code
            name_match = re.search(
                r'<a\s+class="membername"\s+href="/member\.php\?code=(\d+)">'
                r'(?:Representative|Senator)\s+([^<]+)</a>',
                block_html,
                re.IGNORECASE
            )
            if not name_match:
                continue

            member_code = name_match.group(1)
            name = name_match.group(2).strip()

            # Extract party - appears right after the membername close tag
            party_match = re.search(
                r'</a>\s*\(([RD])\)',
                block_html[name_match.start():],
                re.IGNORECASE
            )
            if not party_match:
                continue

            party_abbr = party_match.group(1).upper()

            members.append({
                "name": name,
                "party": "Republican" if party_abbr == "R" else "Democratic",
                "district": district,
                "code": member_code,
                "url": f"https://www.scstatehouse.gov/member.php?code={member_code}"
            })

        return members

    def fetch_chamber_members(self, chamber: str) -> dict[str, dict]:
        """
        Fetch all members for a chamber.

        Args:
            chamber: 'house' or 'senate'

        Returns:
            Dict mapping district number (str) to member info
        """
        url = HOUSE_MEMBERS_URL if chamber == "house" else SENATE_MEMBERS_URL

        logger.info(f"Fetching {chamber.upper()} members from {url}")

        html = self.fetch_page_with_retry(url)

        # Try primary parsing method
        members = self.parse_members_page(html, chamber)

        # If we didn't get enough members, try alternate method
        expected_min = 100 if chamber == "house" else 40
        if len(members) < expected_min:
            logger.info(f"Primary parser found only {len(members)} members, trying alternate...")
            alt_members = self.parse_members_alternate(html, chamber)
            if len(alt_members) > len(members):
                members = alt_members

        logger.info(f"Parsed {len(members)} {chamber} members")

        # Build output structure indexed by district
        result = {}
        for member in members:
            district = member.get("district")
            if district:
                result[str(district)] = {
                    "name": member["name"],
                    "party": member["party"],
                    "url": member.get("url"),
                    "photo_url": member.get("photo_url")
                }

        return result

    def fetch_all(self) -> dict[str, Any]:
        """
        Fetch incumbent data for both chambers.

        Returns:
            Complete incumbents data structure
        """
        output = {
            "lastUpdated": datetime.now(timezone.utc).isoformat() + "Z",
            "source": "SC State Legislature - scstatehouse.gov",
            "house": {},
            "senate": {}
        }

        # Fetch House members
        try:
            output["house"] = self.fetch_chamber_members("house")
            logger.info(f"House: {len(output['house'])} incumbents")
        except Exception as e:
            logger.error(f"Failed to fetch House members: {e}")
            raise

        # Small delay between requests to be respectful
        time.sleep(1)

        # Fetch Senate members
        try:
            output["senate"] = self.fetch_chamber_members("senate")
            logger.info(f"Senate: {len(output['senate'])} incumbents")
        except Exception as e:
            logger.error(f"Failed to fetch Senate members: {e}")
            raise

        return output

    def generate_summary(self, data: dict) -> None:
        """Print summary statistics."""
        logger.info("=" * 60)
        logger.info("INCUMBENT DATA SUMMARY")
        logger.info("=" * 60)

        for chamber in ["house", "senate"]:
            chamber_data = data.get(chamber, {})
            total = len(chamber_data)

            dem_count = sum(
                1 for m in chamber_data.values()
                if m.get("party") == "Democratic"
            )

            rep_count = sum(
                1 for m in chamber_data.values()
                if m.get("party") == "Republican"
            )

            logger.info(f"\n{chamber.upper()}:")
            logger.info(f"  Total incumbents: {total}")
            logger.info(f"  Democrats: {dem_count}")
            logger.info(f"  Republicans: {rep_count}")


def merge_with_existing_party_data(incumbents: dict, src_data_dir: Path) -> None:
    """
    Merge scraped incumbents with existing party-data.json.

    This ensures the party-data.json incumbents section stays current
    while preserving manually-added candidate data.
    """
    party_data_file = src_data_dir / "party-data.json"

    if not party_data_file.exists():
        logger.info("No existing party-data.json found, skipping merge")
        return

    try:
        with open(party_data_file) as f:
            party_data = json.load(f)

        # Update incumbents section
        if "incumbents" not in party_data:
            party_data["incumbents"] = {}

        party_data["incumbents"]["house"] = incumbents.get("house", {})
        party_data["incumbents"]["senate"] = incumbents.get("senate", {})
        party_data["lastUpdated"] = datetime.now().strftime("%Y-%m-%d")

        # Write back
        with open(party_data_file, "w") as f:
            json.dump(party_data, f, indent=2)

        logger.info(f"Merged incumbents into: {party_data_file}")

    except Exception as e:
        logger.warning(f"Failed to merge with party-data.json: {e}")


def main() -> int:
    """Main entry point."""
    logger.info("SC State House Incumbents Scraper")
    logger.info("=" * 60)

    scraper = IncumbentsScraper()

    try:
        # Fetch all incumbent data
        data = scraper.fetch_all()

        # Ensure output directory exists
        OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

        # Write to public/data/incumbents.json
        with open(OUTPUT_FILE, "w") as f:
            json.dump(data, f, indent=2)
        logger.info(f"\nOutput written to: {OUTPUT_FILE}")

        # Also write to src/data/incumbents.json
        SRC_DATA_DIR.mkdir(parents=True, exist_ok=True)
        src_output = SRC_DATA_DIR / "incumbents.json"
        with open(src_output, "w") as f:
            json.dump(data, f, indent=2)
        logger.info(f"Also written to: {src_output}")

        # Optionally merge with party-data.json
        merge_with_existing_party_data(data, SRC_DATA_DIR)

        # Print summary
        scraper.generate_summary(data)

        logger.info("\nScraper completed successfully!")
        return 0

    except Exception as e:
        logger.error(f"Scraper failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
