"""
SC Election Map 2026 - Data Scrapers

This package contains scrapers for fetching election and incumbent data
from SC government sources.

Scrapers:
- fetch_election_history: Downloads election results from SC Election Commission API
- fetch_incumbents: Scrapes current incumbent data from SC State House website

Usage:
    python -m scripts.scrapers.fetch_election_history
    python -m scripts.scrapers.fetch_incumbents
"""

from pathlib import Path

SCRAPERS_DIR = Path(__file__).parent
PROJECT_ROOT = SCRAPERS_DIR.parent.parent
PUBLIC_DATA_DIR = PROJECT_ROOT / "public" / "data"
SRC_DATA_DIR = PROJECT_ROOT / "src" / "data"
