# beginning of LLM written Code, Model: GPT-5.2
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request


class GeminiError(Exception):
    pass


def _post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
    value = json.loads(raw)
    if not isinstance(value, dict):
        raise GeminiError("unexpected response shape")
    return value


def generate_text(*, prompt: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise GeminiError("GEMINI_API_KEY is required")

    model = os.getenv("SUMMARY_GEMINI_MODEL", "gemini-3.1-pro-preview").strip() or "gemini-3.1-pro-preview"
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={api_key}"
    )

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 400},
    }

    delay_s = 2.0
    last_error: Exception | None = None
    for attempt in range(1, 11):
        try:
            response = _post_json(url, payload)
            candidates = response.get("candidates")
            if not isinstance(candidates, list) or not candidates:
                raise GeminiError("no candidates in response")
            content = candidates[0].get("content") if isinstance(candidates[0], dict) else None
            parts = content.get("parts") if isinstance(content, dict) else None
            if not isinstance(parts, list) or not parts:
                raise GeminiError("no parts in response")
            text = parts[0].get("text") if isinstance(parts[0], dict) else None
            if not isinstance(text, str) or not text.strip():
                raise GeminiError("empty text in response")
            return text.strip()
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, GeminiError) as exc:
            last_error = exc
            if attempt >= 10:
                break
            time.sleep(delay_s)
            delay_s *= 2.0
        except Exception as exc:
            last_error = exc
            if attempt >= 10:
                break
            time.sleep(delay_s)
            delay_s *= 2.0

    raise GeminiError(f"gemini generate failed after retries: {last_error}")


# end of LLM written Code
