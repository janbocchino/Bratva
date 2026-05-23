# Implemented user flows (UI → server actions)

Three-column layout: **User** → **Frontend** → **Backend**. Source of truth: `app/` pages and `lib/server/actions/`.

---

## Home

Static landing; no server actions.

```mermaid
flowchart LR
  subgraph userCol[User]
    u1[Opens app root]
  end
  subgraph feCol[Frontend]
    fe1["app/page.tsx"]
  end
  subgraph beCol[Backend]
    be1["No server actions"]
  end
  u1 --> fe1 --> be1
```

---

## Account: create user, load snapshot, add balance

`getAccount` uses an implicit user (`getImplicitUser`); returns `null` if none.

```mermaid
flowchart LR
  subgraph userCol[User]
    uCreate[Enters display name and email]
    uSubmitCreate[Submits create form]
    uOpen[Opens slash account]
    uFund[Enters USD amount]
    uSubmitFund[Submits add balance]
  end
  subgraph feCol[Frontend]
    fePage["app/account/page.tsx"]
    feCreate["handleCreateUser"]
    feRefresh["refreshAccount"]
    feAdd["handleAddBalance"]
  end
  subgraph beCol[Backend]
    beCreate["createUser"]
    beGet["getAccount"]
    beAdd["addBalance"]
  end
  uCreate --> uSubmitCreate --> feCreate --> beCreate --> feRefresh
  uOpen --> fePage --> feRefresh --> beGet
  uFund --> uSubmitFund --> feAdd --> beAdd --> feRefresh
```

---

## Explore index: market list

Poll interval ~1s (`REFRESH_INTERVAL_MS` in `app/explore/page.tsx`).

```mermaid
flowchart LR
  subgraph userCol[User]
    u1[Views Explore]
  end
  subgraph feCol[Frontend]
    fe1["app/explore/page.tsx"]
    fe2["loadMarkets on interval"]
    fe3["Render market table"]
  end
  subgraph beCol[Backend]
    be1["listMarkets"]
  end
  u1 --> fe1 --> fe2
  fe2 --> be1 --> fe3
```

---

## Market detail: load, liquidity, trade

Client loads all markets then selects the row matching `publicId`.

```mermaid
flowchart LR
  subgraph userCol[User]
    uNav[Opens explore market URL]
    uLiq[Submits liquidity USD]
    uTrade[Submits buy or sell order]
  end
  subgraph feCol[Frontend]
    fePage["Explore market detail page"]
    feLoad["refreshPageData"]
    feLiq["handleProvideLiquidity"]
    feTrade["handlePlaceTrade"]
  end
  subgraph beCol[Backend]
    beGet["getAccount"]
    beList["listMarkets"]
    beLiq["provideLiquidityAction"]
    beOrder["placeOrder"]
  end
  uNav --> fePage --> feLoad
  feLoad --> beGet
  feLoad --> beList
  uLiq --> feLiq --> beLiq --> feLoad
  uTrade --> feTrade --> beOrder --> feLoad
```

---

## File reference

| Area | Page | Actions |
|------|------|---------|
| Home | `app/page.tsx` | — |
| Account | `app/account/page.tsx` | `createUser`, `getAccount`, `addBalance` |
| Explore | `app/explore/page.tsx` | `listMarkets` |
| Market | `app/explore/[publicId]/page.tsx` | `getAccount`, `listMarkets`, `provideLiquidityAction`, `placeOrder` |
