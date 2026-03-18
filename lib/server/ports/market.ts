// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import { eq } from 'drizzle-orm';
import { InfraError, InfraNotFoundError, MarketNotFoundError, PortError } from '@/domain/errors';
import type {
  MarketReadRepo as MarketReadRepoDomain,
  MarketWriteRepo as MarketWriteRepoDomain,
  UpdateMarketModelPriceParams,
  UpdateMarketParams,
} from '@/domain/ports/market';
import { A, E, Fn } from '@/lib/shared/imports';
import { Db } from '../db';
import { markets } from '../schema';
import { marketMapper } from './mapper';

const errMapper =
  (WrappedError: typeof InfraNotFoundError | typeof InfraError | typeof MarketNotFoundError) =>
  (cause: unknown) =>
    new PortError({ cause: new WrappedError({ cause }) });

export const marketReadRepo: MarketReadRepoDomain<Db> = {
  getMarket: (o) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () => {
            const query = 'id' in o ? eq(markets.id, o.id) : eq(markets.publicId, o.publicId);
            return db.select().from(markets).where(query).limit(1);
          },
          catch: errMapper(InfraError),
        }),
      ),
      E.flatMap((rows) => Fn.pipe(A.head(rows), E.mapError(errMapper(MarketNotFoundError)))),
      E.map(marketMapper.toDomain),
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
  // beginning of LLM written Code, Model: gpt-5.3-codex
  updateMarketModelPrices: (rows: readonly UpdateMarketModelPriceParams[]) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: async () => {
            if (rows.length === 0) return 0;

            return db.transaction(async (tx) => {
              let updatedCount = 0;
              for (const row of rows) {
                const updatedRows = await tx
                  .update(markets)
                  .set({
                    modelPrice: row.modelPrice,
                  })
                  .where(eq(markets.baseAssetId, row.baseAssetId))
                  .returning({ id: markets.id });
                updatedCount += updatedRows.length;
              }
              return updatedCount;
            });
          },
          catch: errMapper(InfraError),
        }),
      ),
    ),
  // end of LLM written Code
};
// end of LLM written Code
