"""NewsAPI client for every token asset.

For each ``assets/*.json`` (kind=token) this fetches recent article titles
mentioning the asset's ``name`` and writes them into the asset's mirror in
``assets/live/{ID}.json`` under ``news_headlines``.
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import httpx
from dotenv import load_dotenv

# beginning of LLM written Code, Model: claude-opus-4-7
from assets.live.scrape.common import ensure_live_copy, list_token_assets, update_live_field
from assets.live.scrape.config import NEWS_LOOKBACK_HOURS

NEWSAPI_ENDPOINT = "https://newsapi.org/v2/everything"
PAGE_SIZE = 30
LANGUAGE = "en"
REQUEST_TIMEOUT_S = 20.0

load_dotenv()


def fetch_headlines(name: str, api_key: str, lookback_hours: int = NEWS_LOOKBACK_HOURS) -> list[str]:
    """Return unique article titles mentioning ``name`` from NewsAPI /everything.

    Only articles with ``publishedAt`` in [UTC now - ``lookback_hours``, UTC now]
    are requested. Empty list on any failure (network error, non-200, malformed
    JSON). Titles are deduped and returned in NewsAPI's ``publishedAt`` desc order.
    """
    from_utc = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)
    params = {
        "q": f'"{name}"',
        "from": from_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "language": LANGUAGE,
        "pageSize": str(PAGE_SIZE),
        "sortBy": "publishedAt",
        "apiKey": api_key,
    }
    try:
        response = httpx.get(NEWSAPI_ENDPOINT, params=params, timeout=REQUEST_TIMEOUT_S)
        response.raise_for_status()
        articles = response.json().get("articles") or []
    except (httpx.HTTPError, ValueError) as exc:
        print(f"[news] fetch failed for {name!r}: {exc}")
        return []

    seen: set[str] = set()
    titles: list[str] = []
    for article in articles:
        if not isinstance(article, dict):
            continue
        title = (article.get("title") or "").strip()
        if title and title not in seen:
            seen.add(title)
            titles.append(title)
    return titles


def run() -> None:
    api_key = os.environ["NEWS_API_KEY"]
    for asset_id, source_data in list_token_assets():
        ensure_live_copy(asset_id, source_data)
        headlines = fetch_headlines(source_data["name"], api_key)
        update_live_field(asset_id, "news_headlines", headlines)
        print(f"[news] {asset_id}: {len(headlines)} headlines")


if __name__ == "__main__":
    run()
# end of LLM written Code
