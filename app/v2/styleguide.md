# huzzdaq v2 — Design Styleguide

Dark-only trader dashboard for `/v2`. Scoped via `.theme-lumen` in [`app/globals.css`](../globals.css) — legacy UI at `/` unchanged.

## Product identity

| Attribute | Value |
|-----------|-------|
| App name | **huzzdaq** |
| Product type | Personal trading / portfolio dashboard |
| Routes | Home (`/v2`), Invest (`/v2/invest`), Account (`/v2/account`), Admin (`/v2/admin`) |
| Tone | Clean, confident, data-forward — not flashy or gamified |

## Tech foundation

| Layer | Choice |
|-------|--------|
| UI kit | shadcn/ui (base-nova) |
| CSS | Tailwind v4 + OKLCH tokens |
| Icons | Lucide React |
| Font | Inter (400–700) |
| Charts | Recharts via `MarketPriceChart` |

## Color system (`.theme-lumen`)

| Token | OKLCH | Role |
|-------|-------|------|
| `--background` | `oklch(0.16 0.012 260)` | Page background |
| `--foreground` | `oklch(0.97 0.004 260)` | Primary text |
| `--card` | `oklch(0.2 0.014 260)` | Elevated surfaces |
| `--secondary` | `oklch(0.26 0.016 260)` | Hovers, stat tiles |
| `--muted-foreground` | `oklch(0.64 0.012 260)` | Secondary text |
| `--border` | `oklch(0.28 0.014 260)` | Dividers |
| `--primary` | `oklch(0.82 0.17 158)` | Mint — brand + gains |
| `--destructive` | `oklch(0.65 0.2 22)` | Losses, sell |
| `--chart-1`…`5` | mint, blue, yellow-green, magenta, red | Data viz |

Neutrals sit at hue **260**; accent at **158** (mint); destructive at **22**.

## Typography

| Role | Classes |
|------|---------|
| Hero balance | `text-4xl md:text-5xl font-semibold tracking-tight tabular-nums` |
| Page title | `text-2xl md:text-3xl font-semibold tracking-tight` |
| Prices | `font-mono tabular-nums` via `<Money />` |
| Muted labels | `text-sm text-muted-foreground` |

## Layout

| Viewport | Pattern |
|----------|---------|
| Mobile | `max-w-7xl`, `px-5`, floating bottom nav (`rounded-2xl`, `backdrop-blur-xl`) |
| Desktop | Left sidebar `w-64`, main `max-w-7xl px-10` |
| Market detail | `lg:grid-cols-[1fr_320px]` — chart left, sticky trade ticket right |

## Components (`components/v2/`)

| Component | Purpose |
|-----------|---------|
| `app-shell.tsx` | Sidebar + bottom nav |
| `money.tsx` | USD + percent with `tabular-nums` |
| `change-badge.tsx` | Gain/loss pill |
| `asset-badge.tsx` | Circular ticker glyph |
| `stat-tile.tsx` | Labeled metric tile |
| `sparkline.tsx` | Inline SVG polyline |
| `trade-ticket.tsx` | Buy/sell + liquidity panel |
| `markets-table.tsx` | Searchable market list rows |

## Surface pattern

```
rounded-2xl border border-border bg-card
```

Hero cards: `rounded-3xl`. No drop shadows — elevation via background step + border.

## Semantic rules

| Meaning | Treatment |
|---------|-----------|
| Gain / buy | `text-primary`, `bg-primary/15` |
| Loss / sell | `text-destructive`, `bg-destructive/15` |
| Active nav (mobile) | `text-primary` |
| Active nav (desktop) | `bg-secondary text-foreground` |

## File reference

| File | Purpose |
|------|---------|
| `app/globals.css` | `.theme-lumen` token block |
| `app/v2/layout.tsx` | Theme wrapper + Sonner |
| `components/v2/app-shell.tsx` | Navigation shell |
| `lib/client/portfolio-valuation.ts` | Net-worth helper |
| `components/explore/market-price-chart.tsx` | Shared chart (semantic tokens) |
