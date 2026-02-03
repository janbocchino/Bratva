## Domain workflows (sequence diagrams)

This is documentation-only: it captures the workflows that exist today in the codebase, and the intended market-data workflows to build next, using Mermaid `sequenceDiagram`s.

## Implemented (grounded in code)

### GetUser

- Domain port: `domain/ports/user.ts` (`UserReadRepo.getUser`)
- Infra adapter: `lib/server/ports/user.ts` (`userReadRepo.getUser`)

```mermaid
sequenceDiagram
participant ApiRoute
participant UserReadRepoImpl
participant EffectRuntime
participant DbService
participant DrizzleORM
participant SqliteDB

ApiRoute->>UserReadRepoImpl: getUser params, returns Effect_User_PortError_Db
ApiRoute->>EffectRuntime: provideService Db db, runPromise
EffectRuntime->>UserReadRepoImpl: execute Effect

UserReadRepoImpl->>EffectRuntime: serviceOptional Db
alt Db missing in context
  EffectRuntime-->>UserReadRepoImpl: none
  UserReadRepoImpl-->>EffectRuntime: fail PortError InfraNotFoundError
  EffectRuntime-->>ApiRoute: rejected Promise PortError
else Db resolved
  EffectRuntime-->>UserReadRepoImpl: Db

  UserReadRepoImpl->>DrizzleORM: select users where id_or_email_or_publicId limit 1
  DrizzleORM->>SqliteDB: query
  alt query throws
    DrizzleORM-->>UserReadRepoImpl: throw cause
    UserReadRepoImpl-->>EffectRuntime: fail PortError InfraError
    EffectRuntime-->>ApiRoute: rejected Promise PortError
  else rows returned
    SqliteDB-->>DrizzleORM: rowsList
    DrizzleORM-->>UserReadRepoImpl: rowsList

    UserReadRepoImpl->>UserReadRepoImpl: head rows
    alt rows empty
      UserReadRepoImpl-->>EffectRuntime: fail PortError UserNotFoundError
      EffectRuntime-->>ApiRoute: rejected Promise PortError
    else row found
      UserReadRepoImpl->>UserReadRepoImpl: brand fields UserId UserPublicId etc, new Date timestamps
      UserReadRepoImpl-->>EffectRuntime: succeed User
      EffectRuntime-->>ApiRoute: resolved Promise User
    end
  end
end
```

### GetAsset

- Domain port: `domain/ports/asset.ts` (`AssetReadRepo.getAsset`)
- Infra adapter: `lib/server/ports/asset.ts` (`assetReadRepo.getAsset`)

```mermaid
sequenceDiagram
participant ApiRoute
participant AssetReadRepoImpl
participant EffectRuntime
participant DbService
participant DrizzleORM
participant SqliteDB

ApiRoute->>AssetReadRepoImpl: getAsset params, returns Effect_Asset_PortError_Db
ApiRoute->>EffectRuntime: provideService Db db, runPromise
EffectRuntime->>AssetReadRepoImpl: execute Effect

AssetReadRepoImpl->>EffectRuntime: serviceOptional Db
alt Db missing in context
  AssetReadRepoImpl-->>EffectRuntime: fail PortError InfraNotFoundError
  EffectRuntime-->>ApiRoute: rejected Promise PortError
else Db resolved
  AssetReadRepoImpl->>DrizzleORM: select assets where id_or_publicId_or_ticker limit 1
  DrizzleORM->>SqliteDB: query
  alt query throws
    AssetReadRepoImpl-->>EffectRuntime: fail PortError InfraError
    EffectRuntime-->>ApiRoute: rejected Promise PortError
  else rows returned
    AssetReadRepoImpl->>AssetReadRepoImpl: head rows
    alt rows empty
      AssetReadRepoImpl-->>EffectRuntime: fail PortError AssetNotFoundError
      EffectRuntime-->>ApiRoute: rejected Promise PortError
    else row found
      AssetReadRepoImpl->>AssetReadRepoImpl: brand fields AssetId AssetPublicId etc, new Date timestamps
      AssetReadRepoImpl-->>EffectRuntime: succeed Asset
      EffectRuntime-->>ApiRoute: resolved Promise Asset
    end
  end
end
```

### GetPriceSeries (single point by id/publicId)

- Domain port: `domain/ports/price-series.ts` (`PriceSeriesReadRepo.getPriceSeries`)
- Infra adapter: `lib/server/ports/price-series.ts` (`priceSeriesReadRepo.getPriceSeries`)

```mermaid
sequenceDiagram
participant ApiRoute
participant PriceSeriesReadRepoImpl
participant EffectRuntime
participant DbService
participant DrizzleORM
participant SqliteDB

ApiRoute->>PriceSeriesReadRepoImpl: getPriceSeries params, returns Effect_PriceSeries_PortError_Db
ApiRoute->>EffectRuntime: provideService Db db, runPromise
EffectRuntime->>PriceSeriesReadRepoImpl: execute Effect

PriceSeriesReadRepoImpl->>EffectRuntime: serviceOptional Db
alt Db missing in context
  PriceSeriesReadRepoImpl-->>EffectRuntime: fail PortError InfraNotFoundError
  EffectRuntime-->>ApiRoute: rejected Promise PortError
else Db resolved
  PriceSeriesReadRepoImpl->>DrizzleORM: select price_series where id_or_publicId limit 1
  DrizzleORM->>SqliteDB: query
  alt query throws
    PriceSeriesReadRepoImpl-->>EffectRuntime: fail PortError InfraError
    EffectRuntime-->>ApiRoute: rejected Promise PortError
  else rows returned
    PriceSeriesReadRepoImpl->>PriceSeriesReadRepoImpl: head rows
    alt rows empty
      PriceSeriesReadRepoImpl-->>EffectRuntime: fail PortError PriceSeriesNotFoundError
      EffectRuntime-->>ApiRoute: rejected Promise PortError
    else row found
      PriceSeriesReadRepoImpl->>PriceSeriesReadRepoImpl: map via priceSeriesMapper.toDomain, price is Cent.new blob, assetId is AssetId row.assetId
      PriceSeriesReadRepoImpl-->>EffectRuntime: succeed PriceSeries
      EffectRuntime-->>ApiRoute: resolved Promise PriceSeries
    end
  end
end
```

### GetPriceSeriesByAssetId (time-ordered series)

- Domain port: `domain/ports/price-series.ts` (`PriceSeriesReadRepo.getPriceSeriesByAssetId`)
- Infra adapter: `lib/server/ports/price-series.ts` (`priceSeriesReadRepo.getPriceSeriesByAssetId`)

```mermaid
sequenceDiagram
participant ApiRoute
participant PriceSeriesReadRepoImpl
participant EffectRuntime
participant DbService
participant DrizzleORM
participant SqliteDB

ApiRoute->>PriceSeriesReadRepoImpl: getPriceSeriesByAssetId assetId, returns Effect_PriceSeriesList_PortError_Db
ApiRoute->>EffectRuntime: provideService Db db, runPromise
EffectRuntime->>PriceSeriesReadRepoImpl: execute Effect

PriceSeriesReadRepoImpl->>EffectRuntime: serviceOptional Db
alt Db missing in context
  PriceSeriesReadRepoImpl-->>EffectRuntime: fail PortError InfraNotFoundError
  EffectRuntime-->>ApiRoute: rejected Promise PortError
else Db resolved
  PriceSeriesReadRepoImpl->>DrizzleORM: select price_series where asset_id=assetId, orderBy created_at asc
  DrizzleORM->>SqliteDB: query
  alt query throws
    PriceSeriesReadRepoImpl-->>EffectRuntime: fail PortError InfraError
    EffectRuntime-->>ApiRoute: rejected Promise PortError
  else rows returned possibly empty
    PriceSeriesReadRepoImpl->>PriceSeriesReadRepoImpl: map each row via priceSeriesMapper.toDomain
    PriceSeriesReadRepoImpl-->>EffectRuntime: succeed PriceSeriesList
    EffectRuntime-->>ApiRoute: resolved Promise PriceSeriesList
  end
end
```

### GetLedgerByUserId

- Domain port: `domain/ports/ledger.ts` (`LedgerReadRepo.getLedgerByUserId`)
- Infra adapter: `lib/server/ports/ledger.ts` (`ledgerReadRepo.getLedgerByUserId`)

```mermaid
sequenceDiagram
participant ApiRoute
participant LedgerReadRepoImpl
participant EffectRuntime
participant DbService
participant DrizzleORM
participant SqliteDB

ApiRoute->>LedgerReadRepoImpl: getLedgerByUserId userId, returns Effect_UserLedger_PortError_Db
ApiRoute->>EffectRuntime: provideService Db db, runPromise
EffectRuntime->>LedgerReadRepoImpl: execute Effect

LedgerReadRepoImpl->>EffectRuntime: serviceOptional Db
alt Db missing in context
  LedgerReadRepoImpl-->>EffectRuntime: fail PortError InfraNotFoundError
  EffectRuntime-->>ApiRoute: rejected Promise PortError
else Db resolved
  LedgerReadRepoImpl->>DrizzleORM: select from ledger_entries_with_balance view, where user_id=userId, orderBy created_at asc
  DrizzleORM->>SqliteDB: query
  alt query throws
    LedgerReadRepoImpl-->>EffectRuntime: fail PortError InfraError
    EffectRuntime-->>ApiRoute: rejected Promise PortError
  else rows returned
    Note over LedgerReadRepoImpl: Current mapper assumes at least 1 row; it reads rows0.userId
    alt rows empty
      LedgerReadRepoImpl-->>EffectRuntime: defect mapper throws in E.map
      EffectRuntime-->>ApiRoute: rejected Promise defect
    else rows non-empty
      LedgerReadRepoImpl->>LedgerReadRepoImpl: ledgerEntryMapper.toDomain rows; brands ids + Cent/Units based on units column
      LedgerReadRepoImpl-->>EffectRuntime: succeed UserLedger
      EffectRuntime-->>ApiRoute: resolved Promise UserLedger
    end
  end
end
```

## FUTURE (intended market-data workflows)

### IngestMarketPricePoint (single tick/candle)

```mermaid
sequenceDiagram
participant MarketDataProvider
participant MarketDataIngestWorkflow
participant AssetReadRepoPort
participant PriceSeriesWriteRepoPort
participant EffectRuntime
participant DbService
participant DrizzleORM
participant SqliteDB

MarketDataProvider-->>MarketDataIngestWorkflow: priceEvent ticker price timestamp
MarketDataIngestWorkflow->>AssetReadRepoPort: getAsset by ticker, resolve AssetId
MarketDataIngestWorkflow->>PriceSeriesWriteRepoPort: appendPricePoint assetId price createdAt
MarketDataIngestWorkflow->>EffectRuntime: provideService Db db, runPromise or run in worker

PriceSeriesWriteRepoPort->>DbService: Effect requires Db
PriceSeriesWriteRepoPort->>DrizzleORM: insert price_series row
DrizzleORM->>SqliteDB: query
SqliteDB-->>DrizzleORM: ok
DrizzleORM-->>PriceSeriesWriteRepoPort: ok
PriceSeriesWriteRepoPort-->>MarketDataIngestWorkflow: persisted
```

### BackfillPriceSeries (historical range)

```mermaid
sequenceDiagram
participant BackfillJob
participant MarketDataProvider
participant MarketDataIngestWorkflow
participant PriceSeriesWriteRepoPort
participant EffectRuntime
participant DbService
participant DrizzleORM
participant SqliteDB

BackfillJob->>MarketDataProvider: fetchRange ticker start end interval
MarketDataProvider-->>BackfillJob: candlesList
loop each candle or batch
  BackfillJob->>MarketDataIngestWorkflow: ingest candle
end
MarketDataIngestWorkflow->>PriceSeriesWriteRepoPort: bulkAppend assetId candles
MarketDataIngestWorkflow->>EffectRuntime: provideService Db db, runPromise
PriceSeriesWriteRepoPort->>DrizzleORM: batch insert into price_series
DrizzleORM->>SqliteDB: query
SqliteDB-->>DrizzleORM: ok
DrizzleORM-->>PriceSeriesWriteRepoPort: ok
```

### ServePriceChart (client chart request)

```mermaid
sequenceDiagram
participant Client
participant ApiRoute
participant PriceSeriesReadRepoPort
participant EffectRuntime
participant DbService
participant DrizzleORM
participant SqliteDB

Client->>ApiRoute: GET /api/prices asset=...
ApiRoute->>PriceSeriesReadRepoPort: getPriceSeriesByAssetId assetId
ApiRoute->>EffectRuntime: provideService Db db, runPromise
PriceSeriesReadRepoPort->>DrizzleORM: select ordered series
DrizzleORM->>SqliteDB: query
SqliteDB-->>DrizzleORM: rowsList
DrizzleORM-->>PriceSeriesReadRepoPort: PriceSeriesList
PriceSeriesReadRepoPort-->>ApiRoute: PriceSeriesList
Note over ApiRoute: optional downsample/transform, eg OHLC bins, windowing
ApiRoute-->>Client: chart payload
```

### ComputePortfolioSnapshot (ledger + latest prices)

```mermaid
sequenceDiagram
participant Client
participant ApiRoute
participant LedgerReadRepoPort
participant AssetReadRepoPort
participant PriceSeriesReadRepoPort
participant EffectRuntime
participant DbService
participant DrizzleORM
participant SqliteDB

Client->>ApiRoute: GET /api/portfolio/snapshot user=...
ApiRoute->>LedgerReadRepoPort: getLedgerByUserId userId
ApiRoute->>EffectRuntime: provideService Db db, runPromise
LedgerReadRepoPort-->>ApiRoute: UserLedger

loop each asset in ledger summary
  ApiRoute->>AssetReadRepoPort: getAsset by assetId
  ApiRoute->>PriceSeriesReadRepoPort: getPriceSeriesByAssetId assetId, or future getLatestPriceByAssetId
end

Note over ApiRoute: compute per-asset valuation and total portfolio value
ApiRoute-->>Client: portfolio snapshot
```

## FUTURE (account + trading workflows)

These diagrams describe the intended end-to-end flow across the three system entities you requested: `client`, `frontend`, `backend`.

### CreateUserAccount

```mermaid
sequenceDiagram
participant client
participant frontend
participant backend

client->>frontend: open signup and submit displayName and email
frontend->>backend: POST createUser
backend->>backend: validate input and normalize email

alt email already exists
  backend-->>frontend: error emailAlreadyInUse
  frontend-->>client: show validation error
else ok
  backend->>backend: persist new user
  backend-->>frontend: success userPublicId
  frontend-->>client: show account created
end
```

### PerformTrade (buy or sell)

```mermaid
sequenceDiagram
participant client
participant frontend
participant backend

client->>frontend: submit trade intent side ticker quantity
frontend->>backend: POST performTrade
backend->>backend: authenticate user
backend->>backend: resolve asset by ticker
backend->>backend: load latest price for asset
backend->>backend: load user ledger balances

alt side is buy
  backend->>backend: compute required cents = price times quantity
  alt insufficient cent balance
    backend-->>frontend: error insufficientFunds
    frontend-->>client: show trade rejected
  else sufficient balance
    backend->>backend: append ledger entries, credit asset units and debit cents
    backend-->>frontend: success tradeId and updated balances
    frontend-->>client: show trade confirmed
  end
else side is sell
  backend->>backend: check sufficient asset units
  alt insufficient units
    backend-->>frontend: error insufficientUnits
    frontend-->>client: show trade rejected
  else sufficient units
    backend->>backend: append ledger entries, debit asset units and credit cents
    backend-->>frontend: success tradeId and updated balances
    frontend-->>client: show trade confirmed
  end
end
```
