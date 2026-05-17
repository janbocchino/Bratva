"""Aggregate social-media follower counts per token asset via SerpAPI snippets.

For each ``assets/*.json`` (kind=token) this queries SerpAPI for the asset's
``name``, sums the follower counts mentioned in result snippets, and writes the
total into the asset's mirror under ``social_media_followers``. ``-1`` is used
when the call fails or no count was parsed.
"""

from __future__ import annotations

import os
import re
from time import sleep

import requests
from dotenv import load_dotenv

# beginning of LLM written Code, Model: claude-opus-4-7
from assets.live.scrape.common import ensure_live_copy, list_token_assets, update_live_field

load_dotenv()

UNIT = {"K": 1_000, "M": 1_000_000, "B": 1_000_000_000}
PATTERN = re.compile(r"(\d+(?:\.\d+)?)\+?\s*([KMB])?\s*followers", re.I)
PER_REQUEST_SLEEP_S = 1.0


def parse_count(text: str) -> int:
    m = PATTERN.search(text or "")
    return int(float(m[1]) * UNIT.get((m[2] or "").upper(), 1)) if m else 0


def total_followers(name: str, api_key: str) -> int | None:
    r = requests.get(
        "https://serpapi.com/search",
        timeout=20,
        params={"engine": "google", "q": f"{name} social media", "api_key": api_key},
    )
    if r.status_code != 200:
        return None
    total = 0
    for item in r.json().get("organic_results", []):
        count = parse_count(item.get("displayed_link", ""))
        if not count:
            break  # mirrors v1: stop at the first non-followers result
        total += count
    return total or None


def run() -> None:
    api_key = os.environ["SERPAPI_KEY"]
    for asset_id, source_data in list_token_assets():
        ensure_live_copy(asset_id, source_data)
        count = total_followers(source_data["name"], api_key)
        update_live_field(asset_id, "social_media_followers", count if count is not None else -1)
        print(f"[followers] {asset_id}: {count if count is not None else -1}")
        sleep(PER_REQUEST_SLEEP_S)


if __name__ == "__main__":
    run()
# end of LLM written Code
