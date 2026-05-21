// beginning of LLM written Code, Model: gpt-5.3-codex
/*
Decision questionnaire
- How should latest model price be resolved for market reads?
  - [x] Query `model_price` ordered by `created_at DESC` and map latest per market.
  - [ ] Cache latest model price in `markets`.
*/
import { desc, eq, sql } from 'drizzle-orm';
import type { Market } from '@/domain/aggregates/market';
import { InfraError, InfraNotFoundError, MarketNotFoundError, PortError } from '@/domain/errors';
import type {
  InsertModelPriceParams,
  MarketReadRepo as MarketReadRepoDomain,
  MarketWriteRepo as MarketWriteRepoDomain,
  UpdateMarketParams,
} from '@/domain/ports/market';
import { AssetId } from '@/domain/values/asset';
import { TokenAmount, QuoteAmount, LpTokens } from '@/domain/values/currencies';
import { MarketId, MarketPublicId, MarketSequenceNumber } from '@/domain/values/exchange';
import { requireValidDate } from '@/domain/values/timestamp';
import { A, E, Fn } from '@/lib/shared/imports';
import { Db, type DB } from '../db';
import { markets, modelPrice } from '../schema';

const errMapper =
  (WrappedError: typeof InfraNotFoundError | typeof InfraError | typeof MarketNotFoundError) =>
  (cause: unknown) =>
    new PortError({ cause: new WrappedError({ cause }) });

const hasMissingModelPriceTableMessage = (message: string): boolean =>
  message.includes('no such table: model_price') ||
  message.includes('no such table: `model_price`');

const isMissingModelPriceTableError = (error: unknown): boolean => {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current !== undefined && current !== null; depth += 1) {
    if (current instanceof Error && hasMissingModelPriceTableMessage(current.message)) return true;
    if (
      typeof current === 'object' &&
      current !== null &&
      'message' in current &&
      typeof (current as { message?: unknown }).message === 'string' &&
      hasMissingModelPriceTableMessage((current as { message: string }).message)
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
};

const toDomainMarket = (row: typeof markets.$inferSelect, modelPriceValue: bigint): Market => ({
  id: MarketId(row.id),
  publicId: MarketPublicId(row.publicId),
  baseAssetId: AssetId(row.baseAssetId),
  quoteAssetId: AssetId(row.quoteAssetId),
  sequenceNumber: MarketSequenceNumber(row.sequenceNumber),
  ammPool: {
    reserveBase: TokenAmount.new(row.ammReserveBase),
    reserveQuote: QuoteAmount.new(row.ammReserveQuote),
  },
  modelPrice: QuoteAmount.new(modelPriceValue),
  totalLpTokens: LpTokens.new(row.totalLpTokens),
  status: row.status,
  wasPreviouslyActive: row.wasPreviouslyActive,
  createdAt: requireValidDate(row.createdAt),
  updatedAt: requireValidDate(row.updatedAt),
});

const fetchMarketRow = (
  db: DB,
  o: { id: number } | { publicId: string },
): E.Effect<typeof markets.$inferSelect | null, PortError> =>
  E.tryPromise({
    try: async () => {
      const query = 'id' in o ? eq(markets.id, o.id) : eq(markets.publicId, o.publicId);
      const rows = await db.select().from(markets).where(query).limit(1);
      return rows[0] ?? null;
    },
    catch: errMapper(InfraError),
  });

const fetchAllMarketRows = (
  db: DB,
): E.Effect<readonly (typeof markets.$inferSelect)[], PortError> =>
  E.tryPromise({
    try: () => db.select().from(markets),
    catch: errMapper(InfraError),
  });

const fetchLatestModelPriceFromHistory = (
  db: DB,
  marketId: number,
): E.Effect<bigint | null, unknown> =>
  E.tryPromise({
    try: async () => {
      const rows = await db
        .select({ price: modelPrice.price })
        .from(modelPrice)
        .where(eq(modelPrice.marketId, marketId))
        .orderBy(desc(modelPrice.createdAt))
        .limit(1);
      return rows[0]?.price ?? null;
    },
    catch: (cause) => cause,
  });

const fetchLegacyModelPrice = (db: DB, marketId: number): E.Effect<bigint | null, PortError> =>
  E.tryPromise({
    try: async () => {
      const rows = await db
        .select({ price: sql<bigint>`model_price` })
        .from(markets)
        .where(eq(markets.id, marketId))
        .limit(1);
      return rows[0]?.price ?? null;
    },
    catch: errMapper(InfraError),
  });

const fetchLatestModelPriceByMarketId = (
  db: DB,
  marketId: number,
): E.Effect<bigint | null, PortError> =>
  Fn.pipe(
    fetchLatestModelPriceFromHistory(db, marketId),
    E.catchAll((cause) =>
      isMissingModelPriceTableError(cause)
        ? fetchLegacyModelPrice(db, marketId)
        : E.fail(errMapper(InfraError)(cause)),
    ),
  );

const hydrateMarket = (
  db: DB,
  row: typeof markets.$inferSelect,
): E.Effect<Market | null, PortError> =>
  Fn.pipe(
    fetchLatestModelPriceByMarketId(db, row.id),
    E.map((price) => (price === null ? null : toDomainMarket(row, price))),
  );

const insertModelPricesToHistory = (
  db: DB,
  rows: readonly InsertModelPriceParams[],
): E.Effect<number, unknown> =>
  E.tryPromise({
    try: async () =>
      db.transaction(async (tx) => {
        let insertedCount = 0;
        for (const row of rows) {
          const matchingMarketRows = await tx
            .select({ id: markets.id })
            .from(markets)
            .where(eq(markets.baseAssetId, row.baseAssetId))
            .limit(1);
          const marketId = matchingMarketRows[0]?.id;
          if (marketId === undefined) continue;

          const insertedRows = await tx
            .insert(modelPrice)
            .values({
              marketId,
              price: row.price,
              createdAt: row.createdAt,
            })
            .returning({ id: modelPrice.id });
          insertedCount += insertedRows.length;
        }
        return insertedCount;
      }),
    catch: (cause) => cause,
  });

const insertModelPricesToLegacyColumn = (
  db: DB,
  rows: readonly InsertModelPriceParams[],
): E.Effect<number, PortError> =>
  E.tryPromise({
    try: async () =>
      db.transaction(async (tx) => {
        let updatedCount = 0;
        for (const row of rows) {
          await tx.run(
            sql`UPDATE markets
                SET model_price = ${row.price},
                    updated_at = (unixepoch() * 1000)
                WHERE base_asset_id = ${row.baseAssetId}`,
          );
          updatedCount += 1;
        }
        return updatedCount;
      }),
    catch: errMapper(InfraError),
  });

export const marketReadRepo: MarketReadRepoDomain<Db> = {
  getMarket: (o) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        Fn.pipe(
          fetchMarketRow(db, o),
          E.flatMap((row) =>
            row === null
              ? E.fail(errMapper(MarketNotFoundError)(new Error('Market not found')))
              : hydrateMarket(db, row),
          ),
          E.flatMap((market) =>
            market === null
              ? E.fail(errMapper(MarketNotFoundError)(new Error('Market model price not found')))
              : E.succeed(market),
          ),
        ),
      ),
    ),

  listMarkets: () =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        Fn.pipe(
          fetchAllMarketRows(db),
          E.flatMap((rows) =>
            E.forEach(rows, (row) => hydrateMarket(db, row), {
              concurrency: 8,
            }),
          ),
          E.map((rows) => rows.filter((row): row is Market => row !== null)),
        ),
      ),
    ),

  getLatestModelPriceByMarketId: (marketId) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) => fetchLatestModelPriceByMarketId(db, marketId)),
      E.map((price) => (price === null ? null : QuoteAmount.new(price))),
    ),
};

export const marketWriteRepo: MarketWriteRepoDomain<Db> = {
  updateMarketAfterMatch: (o: UpdateMarketParams) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db
              .update(markets)
              .set({
                sequenceNumber: o.sequenceNumber,
                ammReserveBase: o.ammReserveBase,
                ammReserveQuote: o.ammReserveQuote,
              })
              .where(eq(markets.id, o.marketId)),
          catch: errMapper(InfraError),
        }),
      ),
      E.asVoid,
    ),

  insertModelPrices: (rows: readonly InsertModelPriceParams[]) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        rows.length === 0
          ? E.succeed(0)
          : Fn.pipe(
              insertModelPricesToHistory(db, rows),
              E.catchAll((cause) =>
                isMissingModelPriceTableError(cause)
                  ? insertModelPricesToLegacyColumn(db, rows)
                  : E.fail(errMapper(InfraError)(cause)),
              ),
            ),
      ),
    ),
};
// end of LLM written Code
