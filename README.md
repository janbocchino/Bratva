# Bratva

## Variable Conventions

- `*Prs` | `*_PRS`

Short for persistence. Indicates that the type of the variable is a kind that is persisted to disk.

- `*Dto` | `*_DTO`

Short for data transfer object. Indicates that the type of the variable is a kind that is used to transfer data between the client and the server.

## Domain (in `domain/`)

- Everythign in the domain folder should be pure and have no side effects.


## Functionality

- to add assets to the databse run ```bun assets:import```
- set `DATABASE_URL` in root `.env`; Next, Drizzle, and the worker all use that same value.
- to run the worker: ```uv run bratva-worker```
- the worker reads `assets/live/*.json`, infers model prices, and writes directly to SQLite `model_price`.

Worker: uv run python -m backend.main

Worker: uv run bratva-worker

Run all: ```npm run dev:all```