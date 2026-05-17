"""Wikipedia ORG-NER associations per token asset, with a per-page revid cache.

For each ``assets/*.json`` (kind=token) this fetches the lead extract of the
asset's Wikipedia page, runs spaCy ORG-NER over it, and writes the resulting
list into the asset's mirror under ``associations``. Pages whose revid hasn't
changed since the last run skip the fetch and the NER pass.
"""

from __future__ import annotations

import json
from pathlib import Path
from time import sleep

import requests
import spacy

# beginning of LLM written Code, Model: claude-opus-4-7
from common import LIVE_DIR, ensure_live_copy, list_token_assets, update_live_field

CACHE = LIVE_DIR / ".wiki_revid_cache.json"
WIKI = "https://en.wikipedia.org/w/api.php"
HEADERS = {"User-Agent": "ShortAFriend/1.0 (https://shortafriend.com)"}
PER_REQUEST_SLEEP_S = 0.5

nlp = spacy.load("en_core_web_sm")


def fetch_wiki(name: str) -> tuple[int | None, str]:
    r = requests.get(
        WIKI,
        headers=HEADERS,
        timeout=20,
        params={
            "action": "query",
            "format": "json",
            "titles": name,
            "prop": "extracts|revisions",
            "exintro": True,
            "explaintext": True,
            "rvprop": "ids",
            "redirects": 1,
        },
    )
    if r.status_code != 200:
        return None, ""
    page = next(iter(r.json().get("query", {}).get("pages", {}).values()), {})
    revid = (page.get("revisions") or [{}])[0].get("revid")
    return revid, page.get("extract", "")


def extract_orgs(text: str) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for ent in nlp(text).ents:
        if ent.label_ == "ORG" and ent.text not in seen:
            seen.add(ent.text)
            out.append(ent.text)
    return out


def run() -> None:
    cache: dict = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    for asset_id, source_data in list_token_assets():
        ensure_live_copy(asset_id, source_data)
        name = source_data["name"]
        revid, extract = fetch_wiki(name)
        cached = cache.get(name)
        if cached and cached.get("revid") == revid:
            orgs = cached["associations"]
        else:
            orgs = extract_orgs(extract)
            cache[name] = {"revid": revid, "associations": orgs}
            sleep(PER_REQUEST_SLEEP_S)
        update_live_field(asset_id, "associations", orgs)
        print(f"[associations] {asset_id}: {len(orgs)} orgs")

    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    run()
# end of LLM written Code
