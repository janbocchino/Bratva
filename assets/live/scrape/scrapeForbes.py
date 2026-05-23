"""Forbes Real-Time Billionaires snapshot for token assets.

Fetches the rtb-api list once, indexes it by ``name``, and for each token asset
whose name matches an RTB entry writes ``net_worth`` (USD) and ``occupation``
into the asset's mirror. When RTB omits ``age`` or supplies a non-integer value,
the mirror ``age`` is unchanged. Assets that don't match any RTB entry are left alone.
"""

from __future__ import annotations

import requests

# beginning of LLM written Code, Model: claude-opus-4-7
from assets.live.scrape.common import ensure_live_copy, list_token_assets, update_live_field

RTB = "https://cdn.statically.io/gh/komed3/rtb-api/main/api"
RTB_FALLBACK = "https://cdn.jsdelivr.net/gh/komed3/rtb-api@main/api"
HEADERS = {"User-Agent": "ShortAFriend-v2/1.0", "Accept": "application/json"}

OCCUPATION_KEYWORDS = [
    (("tech", "software", "internet", "online", "e-commerce"), "Entrepreneur"),
    (("finance", "investment", "hedge fund"), "Investor"),
    (("media", "entertainment", "film", "television"), "Media Proprietor"),
    (("sports", "athlete"), "Athlete"),
]


def occupation(industries: list[str] | None) -> str:
    blob = " ".join(industries or []).lower()
    for kws, label in OCCUPATION_KEYWORDS:
        if any(k in blob for k in kws):
            return label
    return "Businessman"


def rtb_get(session: requests.Session, path: str) -> dict:
    for base in (RTB, RTB_FALLBACK):
        try:
            r = session.get(f"{base}/{path}", timeout=30)
            if r.ok:
                return r.json()
        except requests.RequestException:
            continue
    raise RuntimeError(f"rtb-api fetch failed: {path}")


def run() -> None:
    session = requests.Session()
    session.headers.update(HEADERS)
    listing = rtb_get(session, "list/rtb/latest")
    by_name = {entry.get("name", ""): entry for entry in listing.get("list", [])}

    for asset_id, source_data in list_token_assets():
        ensure_live_copy(asset_id, source_data)
        entry = by_name.get(source_data["name"])
        if entry is None:
            print(f"[forbes] {asset_id}: not in RTB list, skipping")
            continue
        net_worth = int(round(float(entry.get("networth") or 0) * 1_000_000))
        occ = occupation(entry.get("industry"))
        update_live_field(asset_id, "net_worth", net_worth)
        update_live_field(asset_id, "occupation", occ)
        # beginning of LLM written Code, Model: Composer
        age_raw = entry.get("age")
        age_extra = ""
        if age_raw is not None:
            try:
                age_i = int(age_raw)
            except (TypeError, ValueError):
                pass
            else:
                if age_i > 0:
                    update_live_field(asset_id, "age", age_i)
                    age_extra = f" age={age_i}"
        # end of LLM written Code
        print(f"[forbes] {asset_id}: net_worth={net_worth} occupation={occ}{age_extra}")


if __name__ == "__main__":
    run()
# end of LLM written Code
