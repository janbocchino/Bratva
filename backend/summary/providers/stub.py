# beginning of LLM written Code, Model: GPT-5.2
from __future__ import annotations

import json
from typing import Any


def _safe_load_snapshot(snapshot_json_str: str) -> dict[str, Any] | None:
    try:
        value = json.loads(snapshot_json_str)
        return value if isinstance(value, dict) else None
    except Exception:
        return None


def _as_str_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    items: list[str] = []
    for x in value:
        s = str(x).strip()
        if s:
            items.append(s)
    return items


def _first_headline(context: dict[str, Any]) -> str | None:
    attrs = context.get("features") if isinstance(context.get("features"), dict) else {}
    headlines = _as_str_list(attrs.get("news_headlines"))
    if not headlines:
        return None
    return headlines[0]


def _association_hint(context: dict[str, Any]) -> str | None:
    attrs = context.get("features") if isinstance(context.get("features"), dict) else {}
    assoc = _as_str_list(attrs.get("associations"))
    if not assoc:
        return None
    return assoc[0]


def _sanitize_headline_for_sentence(headline: str) -> str:
    s = headline.replace("\n", " ").strip()
    while s and s[-1] in ".!?":
        s = s[:-1].rstrip()
    return s


def generate(*, new_snapshot_json: str, old_snapshot_json: str | None, model_price_usd: str) -> str:
    new = _safe_load_snapshot(new_snapshot_json) or {}
    old = _safe_load_snapshot(old_snapshot_json) if old_snapshot_json is not None else None

    name = str(new.get("name") or "This token").strip() or "This token"
    headline = _first_headline(new)
    assoc = _association_hint(new)
    headline_clean = None if headline is None else _sanitize_headline_for_sentence(headline)

    if old is None:
        s2 = (
            f'Recent coverage points to "{headline_clean}".'
            if headline_clean
            else "No meaningful recent coverage is showing up right now."
        )
        if assoc and not headline:
            s2 = f"Attention is anchored on who {name} is connected to (e.g., {assoc})."
        return (
            f"{name} is valued at about {model_price_usd} by the model (not a trade price). "
            f"{s2}"
        )

    old_headline = None if old is None else _first_headline(old)
    old_headline_clean = None if old_headline is None else _sanitize_headline_for_sentence(old_headline)
    old_assoc = None if old is None else _association_hint(old)

    s2 = (
        f'Recent coverage points to "{headline_clean}".'
        if headline_clean
        else "No meaningful recent coverage is showing up right now."
    )
    if assoc and not headline:
        s2 = f"Attention is anchored on who {name} is connected to (e.g., {assoc})."

    moved_hint: str | None = None
    if headline_clean and headline_clean != old_headline_clean:
        moved_hint = f'This moved since the prior update as the narrative shifted toward "{headline_clean}".'
    elif assoc and assoc != old_assoc:
        moved_hint = f"This moved since the prior update as new context around {assoc} entered the story."
    else:
        moved_hint = "This moved since the prior update as the latest context shifted meaningfully."

    return (
        f"{name} is valued at about {model_price_usd} by the model (not a trade price). "
        f"{s2} "
        f"{moved_hint}"
    )


# end of LLM written Code
