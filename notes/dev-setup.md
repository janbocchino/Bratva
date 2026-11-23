# Dev setup

Developer conventions and local run commands. The public overview lives in the root `README.md`. Inference detail lives in `backend/backend.md`.

## Decision questionnaire

Where should the old README developer notes live?

- [x] `notes/dev-setup.md` — naming conventions and run commands stay with the other working notes.
- [ ] Root `README.md` — that file is the published explanation of the product.
- [ ] `backend/backend.md` — that file is the inference pipeline, not app conventions.

## Variable conventions

- `*Prs` | `*_PRS` — persistence. The value is a kind that is written to disk.
- `*Dto` | `*_DTO` — data transfer object. The value crosses the client/server boundary.

## Domain

Everything in `domain/` is pure and has no side effects.

## Environment

Next, Drizzle, and the Python worker share one root `.env`.

Required:

- `DATABASE_URL` — local SQLite URL, for example `file:./dev.db`.

Read from the environment when a feature needs them. Do not commit values.

- `AUTH_SESSION_SECRET` — required in production. Dev uses a fixed local secret when this is unset.
- `SERPAPI_KEY` — follower counts in `assets/live/scrape/followers.py`.
- `GEMINI_API_KEY` — valuation summaries when `SUMMARY_LLM_PROVIDER=gemini`. The default provider is `stub`.
- `EMBEDDING_MODEL` — default `models/gte-base`.
- `POWER_MODEL` — path to the safetensors checkpoint.
- `PRICE_UPDATE_INTERVAL` — worker tick in seconds, default `1.0`.

`NEWS_API_KEY` is unused. Headlines come from Yahoo Finance.

## Run

```bash
bun install
uv sync
bun run db:migrate
bun run assets:import
uv run python -m spacy download en_core_web_sm
bun run dev:all
```

`bun run assets:import` loads `assets/*.json` into the database.

`bun run dev:all` starts the Next app, `python -m backend.main`, and `python -m assets.live.scrape`.

The price worker on its own:

```bash
uv run bratva-worker
```

That entry point is `python -m backend.main`. It reads `assets/live/*.json`, infers model prices, and writes them to SQLite `model_price`.
