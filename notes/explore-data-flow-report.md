# Explore page data flow (scraped asset value -> UI)

This report maps how token asset facts move from scraped JSON mirrors through ML inference, SQLite, and Next.js server actions into the Explore list and market detail views.

---

## 1. End-to-end narrative

1. Canonical definitions live under `assets/*.json` (`kind: "token"`). These files define `assetId`, `name`, and baseline fields used by the ML feature schema.
2. `bun run assets:import` (`scripts/create-assets-from-json.ts`) upserts rows in SQLite `assets`, creates a USD-quoted `markets` row per token (`status: closed` initially), and seeds `model_price` with zero so reads stay consistent.
3. The scrape supervisor (`uv run python -m assets.live.scrape`) runs periodic jobs (`news`, `followers_v2`, `scrapeForbes_v2`, `extended_associations_v2`) that write live mirrors at `assets/live/{assetId}.json`.
4. The price worker (`uv run python -m backend.main` or `uv run bratva-worker`) reads `assets/live/*.json` each tick, normalizes samples, runs `calculate_model_price`, and writes directly to SQLite `model_price`.
5. The worker resolves each row as `assetTicker -> assets.ticker -> markets.base_asset_id`, stores the price using the same fixed-point blob encoding as `scaledBigintBlob`, and uses the tick timestamp as `created_at`.
6. Explore UI loads `listMarkets` (`lib/server/actions/list-markets.ts`), which chooses `displayPriceScaled`:
   - `closed` -> latest `model_price` for that market.
   - `pending` / `active` -> latest `price_series` for the base asset, else AMM ratio from reserves if non-zero, else `model_price` fallback.
7. Market detail (`app/explore/[publicId]/page.tsx`) uses the same `listMarkets` row for headline price context and loads `getMarketModelPriceSeries` or `getMarketPriceSeries` depending on `shouldUseModelPriceChart`.

---

## 2. Mermaid flowchart

```mermaid
flowchart TB
  subgraph Definitions["1. Asset definitions"]
    Canon["assets/*.json"]
    LiveMirror["assets/live/{id}.json"]
    Canon -->|"ensure live copy"| LiveMirror
  end

  subgraph Scrape["2. Scraping"]
    Sup["assets.live.scrape.supervisor"]
    Jobs["news / followers / Forbes / associations"]
    Sup --> Jobs
    Jobs -->|"update live fields"| LiveMirror
  end

  subgraph Boot["3. DB bootstrap"]
    Import["bun assets:import"]
    SQLite[("SQLite assets / markets / model_price / price_series")]
    Import -->|"create markets and seed model_price"| SQLite
  end

  subgraph ML["4. ML worker"]
    Worker["backend.worker.PriceWorker"]
    Infer["calculate_model_price"]
    Writer["ModelPriceWriter"]
    Worker --> Infer
    Infer --> Writer
    Writer -->|"INSERT model_price"| SQLite
  end

  LiveMirror --> Worker

  subgraph Next["5. Next.js UI"]
    ExploreIdx["/explore"]
    LM["listMarkets"]
    Detail["/explore/[publicId]"]
    Series["model or trade series actions"]
    ExploreIdx -->|"every 1s"| LM
    Detail -->|"initial + 15s poll"| LM
    Detail --> Series
    LM --> SQLite
    Series --> SQLite
  end

  Canon -.->|"assetId / name for import"| Import
```

---

## 3. Are the pieces plugged together?

### 3.1 What is wired correctly

| Link | Status |
|------|--------|
| Scrape -> live JSON mirrors | Supervisors call `ensure_live_copy` / `update_live_field`; locks prevent clobbering between scrapers. |
| Live JSON -> ML features | Worker requires the same field names as `InputData` / normalization (`backend/worker.py`). |
| Worker -> SQLite | `ModelPriceWriter` inserts directly into `model_price`, keyed by ticker -> market. |
| SQLite -> Explore list/detail | `listMarkets` and chart actions read through Effect ports (`marketReadRepo`, `priceSeriesReadRepo`). |
| Display price semantics | List page documents closed vs active/pending sources; chart helper `shouldUseModelPriceChart` mirrors that split. |

### 3.2 Loose ends and risks

1. **`assets/live/*.json` must exist before the worker sees an asset**  
   The worker globs `assets/live` only. Imported DB assets without a scraped mirror are invisible to the worker until a scraper creates `ensure_live_copy`.

2. **Market resolution is first match**  
   The worker mirrors the existing TypeScript behavior by selecting one market for a base asset without forcing `quote_asset_id = USD`. Multiple markets per base asset could attach prices to the wrong row.

3. **One database URL must be shared**  
   Next, Drizzle, and the Python worker all need the same root `.env` `DATABASE_URL`.

4. **Remote libsql URLs are not supported by the Python writer**  
   The worker uses stdlib `sqlite3`, so `DATABASE_URL` must be a local SQLite file URL in this setup.

---

## 4. File index (quick reference)

| Stage | Primary locations |
|-------|-------------------|
| Canonical JSON | `assets/*.json` |
| Live mirrors | `assets/live/*.json`, `assets/live/scrape/*.py` |
| Import to DB | `scripts/create-assets-from-json.ts` |
| ML + SQLite write | `backend/worker.py`, `backend/persistence/model_price.py`, `backend/ml/price.py`, `backend/constants.py` |
| Env | `.env`, `lib/server/env.ts`, `backend/main.py` |
| Listing | `lib/server/actions/list-markets.ts`, `lib/server/ports/market.ts` |
| UI | `app/explore/page.tsx`, `app/explore/[publicId]/page.tsx`, `components/explore/market-price-chart.tsx` |

---

*Generated by tracing the Bratva repository (scraping -> worker -> SQLite -> Explore UI).*
