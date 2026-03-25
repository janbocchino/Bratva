# Gaps toward a fully tradable market

Complements [implemented.md](./implemented.md): backend-only actions, UI gaps, and roadmap items (including `notes/next_steps.md`).

---

## Server actions not wired in the app

These exist under `lib/server/actions/` but have no `app/` caller yet.

```mermaid
flowchart LR
  subgraph userCol[User]
    u1["Cancel order withdraw LP or withdraw balance"]
  end
  subgraph feCol[Frontend]
    fe1["No page calls these actions yet"]
  end
  subgraph beCol[Backend]
    be1["cancelOrder"]
    be2["withdrawLiquidityAction"]
    be3["withdrawBalance"]
  end
  u1 --> fe1
  fe1 -.-> be1
  fe1 -.-> be2
  fe1 -.-> be3
```

| Action | Module |
|--------|--------|
| `cancelOrder` | `lib/server/actions/cancel-order.ts` |
| `withdrawLiquidityAction` | `lib/server/actions/withdraw-liquidity.ts` |
| `withdrawBalance` | `lib/server/actions/withdraw-balance.ts` |

---

## Product and infra roadmap (from notes)

```mermaid
flowchart TB
  subgraph chain[Chain and wallets]
    c1[Polygon or Solana]
    c2[Solidity contracts]
    c3[MetaMask WalletConnect]
    c4[CoinGecko pricing]
  end
  subgraph fiat[Fiat]
    f1[Stripe]
    f2[Legal entity]
  end
  subgraph ux[UX and rules]
    x1[No trading if user is LP for market]
    x2[Fractional base units]
    x3[Errors visible to user e.g. insufficient balance]
    x4[USD from CoinGecko]
    x5[Show liquidity per asset]
  end
  subgraph ops[Operations]
    o1[Market creation on asset creation]
    o2[Token to token exchange later]
  end
```

---

## Target pipeline: identity to settlement

Solid arrows: main stages the codebase moves toward. Dashed arrows: gaps or partial work for a production-grade tradable market.

```mermaid
flowchart LR
  idNode[Identity]
  fundNode[Funding]
  discNode[Market discovery]
  orderNode[Order entry]
  matchNode[Matching and settlement]
  posNode[Positions and PnL]
  riskNode[Risk and rules]
  idNode --> fundNode --> discNode --> orderNode --> matchNode --> posNode --> riskNode
  gw[Wallet and KYC]
  gf[Stripe and on chain]
  gd[Admin market creation]
  go[Cancel and amend UI]
  gm[On chain settlement]
  gp[Withdrawals reporting]
  gr[LP versus trader rules]
  idNode -.-> gw
  fundNode -.-> gf
  discNode -.-> gd
  orderNode -.-> go
  matchNode -.-> gm
  posNode -.-> gp
  riskNode -.-> gr
```

---

## Maintenance

When you add a server action under `app/`, update [implemented.md](./implemented.md). When `cancelOrder`, withdraw flows, or funding exits ship in the UI, move the corresponding edges from this file into `implemented.md`.
