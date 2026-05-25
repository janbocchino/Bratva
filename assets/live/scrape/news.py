"""Yahoo Finance news client for every token asset.

For each ``assets/*.json`` (kind=token) this queries Yahoo Finance Search for
the asset's ``name`` and writes article titles into the asset's mirror in
``assets/live/{ID}.json`` under ``news_headlines``.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import yfinance as yf

# beginning of LLM written Code, Model: Composer
from assets.live.scrape.common import ensure_live_copy, list_token_assets, update_live_field
from assets.live.scrape.config import NEWS_LOOKBACK_HOURS

MAX_RECORDS = 30


def fetch_headlines(
    name: str,
    lookback_hours: int = NEWS_LOOKBACK_HOURS,
    max_records: int = MAX_RECORDS,
) -> list[str]:
    """Return unique article titles mentioning ``name`` from Yahoo Finance Search.

    Only articles with ``providerPublishTime`` in [UTC now − ``lookback_hours``,
    UTC now] are kept. Articles without ``providerPublishTime`` are skipped.
    Empty list on any failure. Titles are deduped by exact string match and
    returned in the order Yahoo yielded them.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)
    try:
        articles = yf.Search(name, news_count=max_records, raise_errors=False).news or []
    except Exception as exc:
        print(f"[news] fetch failed for {name!r}: {exc}")
        return []

    seen: set[str] = set()
    titles: list[str] = []
    for article in articles:
        if not isinstance(article, dict):
            continue
        pub = article.get("providerPublishTime")
        if pub is not None:
            published = datetime.fromtimestamp(int(pub), tz=timezone.utc)
            if published < cutoff:
                continue
        title = (article.get("title") or "").strip()
        if title and title not in seen:
            seen.add(title)
            titles.append(title)
    return titles


def run() -> None:
    for asset_id, source_data in list_token_assets():
        ensure_live_copy(asset_id, source_data)
        headlines = fetch_headlines(source_data["name"])
        update_live_field(asset_id, "news_headlines", headlines)
        print(f"[news] {asset_id}: {len(headlines)} headlines")


if __name__ == "__main__":
    run()
# end of LLM written Code
