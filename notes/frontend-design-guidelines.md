# Frontend design guidelines

## Product & UX

- **Architecture:** classic Next.js / React — reusable layout components (header, footer, nav).
- **Two views:** user & admin
  - **User:** show all data that belongs to the user; hide sensitive internal ids (numeric `id`, raw asset ids, etc.). Use `publicId` in URLs and labels where needed.
  - **Admin:** separate shell behind server-side role checks (`getRequiredAdmin()`). Admin tooling lives only under the admin route tree.
- **Top menu (user):**
  - Home
  - Invest / Trade (today's `explore` — market list + detail/trade)
  - Account
- **Design:**
  - Font: Inter (already on root layout)
  - Super clean and simple
  - shadcn charts (reuse / improve `components/ui/chart.tsx` + `MarketPriceChart` patterns)
  - shadcn primitives for everything else (Button, Card, Table, Field, Badge, etc.) — semantic tokens, not raw `border-black/10`

---

## Backend connection (do not break this)

The frontend **never** talks to `domain/` or the DB directly. Every screen calls **server actions** in `lib/server/actions/*`, which return plain serializable objects.

| Screen | Server actions | Key types |
|--------|----------------|-----------|
| Market list | `listMarkets()` | `ExploreMarketRow` |
| Market detail | `getAccount`, `listMarkets`, `getMarketPriceSeries`, `getMarketModelPriceSeries`, `getAssetValuationSummary`, `placeOrder`, `provideLiquidityAction` | `AccountSnapshot`, `MarketPriceSeriesPoint`, etc. |
| Account | `getAccount`, `createUser`, `signIn`, `addBalance`, `withdrawBalance`, `cancelOrder` | `AccountSnapshot`, `UserEmail`, `UserDisplayName` |
| Admin layout | `getRequiredAdmin()` in layout | — |

**Rule:** new UI imports the **same** functions from `@/lib/server/actions/*` and reuses their exported types. No duplicate business logic in components. No new API layer unless explicitly planned.

Server actions **throw** on failure; pages use `try/catch` + `formatActionError`. Keep that pattern; surface errors via `sonner` / `Alert` instead of only inline `<p>`.

---

## Building the new UI without replacing the old one (reversible)

Use a **parallel route segment**, not a git branch. Both UIs run at once; revert = delete the new folders.

**Do not** use a route group that collides on `/` (e.g. `(v2)/page.tsx` vs `(user)/page.tsx`). Use a real segment:

```
app/
  layout.tsx              # shared html/body/Inter — leave as-is
  (user)/ ...             # OLD UI — untouched
  admin/ ...              # OLD admin — untouched
  v2/
    layout.tsx            # new shell: header, nav, footer
    page.tsx              # Home
    invest/page.tsx       # Invest / Trade (listMarkets)
    invest/[publicId]/page.tsx
    account/page.tsx
    admin/                # new admin (reuse getRequiredAdmin guard)
components/
  v2/                     # new shared components only
  ui/                     # shadcn primitives (shared, additive)
```

- **While building:** old at `/`, new at `/v2` — compare side by side.
- **Promote:** point root at v2 or rename routes when ready.
- **Revert:** delete `app/v2/` and `components/v2/`; old UI is unchanged.

---

## Design foundation (do first)

1. **shadcn design tokens** — extend `app/globals.css` with full semantic variables (`--primary`, `--card`, `--border`, `--muted-foreground`, `--chart-1`…). Old pages use literal colors; they won't break. Optionally scope tokens under a wrapper on `v2/layout.tsx` if you want isolation.
2. **Install primitives** — currently only `components/ui/chart.tsx` exists. Add: `button`, `card`, `input`, `table`, `tabs`, `badge`, `dropdown-menu`, `navigation-menu`, `sheet`, `dialog`, `sonner`, `skeleton`, `separator`, `empty`, `toggle-group`, `field`.
3. **Compose screens** from shadcn blocks (Card + Table + Chart for markets; FieldGroup for forms; Badge for status; Skeleton for loading).

`components.json` is already set to `base-nova` + Inter + Tailwind v4.

---

## Carry over from current UI

- Polling / refresh where needed (`useEffect` + `setInterval` on explore detail — markets, price series, valuation summary).
- Chart logic: `lib/client/market-chart-timespan.ts`, live tick merge, model vs trade chart switch (`shouldUseModelPriceChart`).
- Trade vs liquidity rules (can't trade while LP; closed market messaging).
- User view: no internal ids in tables; admin can show more.
- Liquidity providing must **not** be labeled as withdraw (see `notes/next_steps.md`).

---

## AGENTS.md

- Mark LLM-written code with the standard wrapper + model name.
- Reuse existing functions; no duplicate code.
- Decision questionnaires when crossing file or folder boundaries.
- Failures stay explicit (`formatActionError`, typed action returns).
