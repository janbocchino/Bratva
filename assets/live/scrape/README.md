# Live scrape orchestration

## Run

From repo root (install optional deps first):

```bash
uv sync --extra scrape
python -m spacy download en_core_web_sm
uv run python -m assets.live.scrape
```

Cadence: [`config.py`](config.py). Last-run state: `.last_run.json` in this directory.

## Data layout

| Role | Path |
|------|------|
| Canonical token definitions (read) | `assets/*.json` |
| Live mirrors (read/write by scrapers) | `assets/live/{assetId}.json` |

## Worker vs live mirrors

[`backend/worker.py`](../../backend/worker.py) currently loads **`assets/*.json`** for model input, not `assets/live/*.json`. Scrapers refresh the live mirrors with headlines, followers, etc. If production inference should use scraped fields, point the worker (or add a merge step) at live data explicitly.

## Decision questionnaire (folder boundary)

Why is `assets/` a Python package?

- [x] So `python -m assets.live.scrape` works with a stable import path from the repo root.
- [ ] Alternative was `PYTHONPATH=assets/live` + loose scripts — rejected to avoid ambiguous imports.
