# beginning of LLM written Code, Model: GPT-5.2
from __future__ import annotations

import hashlib
import json
from typing import Any


def _norm(value: Any) -> Any:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list) and all(isinstance(x, str) for x in value):
        return sorted([x.strip() for x in value if x.strip()])
    return value


def snapshot_json_and_fingerprint(*, name: str, features: dict[str, Any]) -> tuple[str, str]:
    snapshot = {
        "name": name.strip(),
        "features": {k: _norm(v) for k, v in features.items()},
    }
    snapshot_json = json.dumps(snapshot, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    fp = hashlib.sha256(snapshot_json.encode("utf-8")).hexdigest()
    return snapshot_json, fp


# end of LLM written Code
