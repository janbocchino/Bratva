# huzzdaq

huzzdaq is a market for people. Each person is a token. A model prices that token from public signals — news, followers, net worth, and similar fields — and the price keeps moving as those signals change. You trade it with a USD balance that lives in the app.

The repository name is Bratva. The app you use is huzzdaq, at `/v2`.

## What you can do

- **Account** (`/v2/account`). Create an account with a name and email, or sign in with an email that already exists. Add or withdraw USD. That credits the in-app ledger. It does not charge a card. The same page shows balances, ledger history, and open orders, and you can cancel an order there.
- **Invest** (`/v2/invest`). A live list of markets. Open one to see the price chart and a short valuation note, provide liquidity, or place a buy or sell (price, size, optional stop, optional expiry).
- **Home** (`/v2`). Portfolio value and token holdings after you sign in.
- **Admin** (`/v2/admin`). A read-only market list for admin users.

## Run it

You need [Bun](https://bun.sh), [uv](https://docs.astral.sh/uv/), and Python 3.13 or newer.

Create a root `.env` (gitignored) with:

```bash
DATABASE_URL=file:./dev.db
```

Then:

```bash
bun install
uv sync
bun run db:migrate
bun run assets:import
uv run python -m spacy download en_core_web_sm
bun run dev:all
```

Open [http://localhost:3000/v2](http://localhost:3000/v2).

`dev:all` starts the site, the price worker, and the live scrape together. Naming conventions, optional environment variables, and running the worker on its own are in [`notes/dev-setup.md`](notes/dev-setup.md).
