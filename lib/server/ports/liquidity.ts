import { eq, sql } from 'drizzle-orm';
import type { MarketId } from '@/domain/values/exchange';
import { InfraError, InfraNotFoundError, PortError } from '@/domain/errors';
import type {
  LiquidityPositionWriteRepo as LiquidityPositionWriteRepoDomain,
  LiquidityMarketWriteRepo as LiquidityMarketWriteRepoDomain,
  CreateLiquidityPositionParams,
  UpdateMarketLiquidityParams,
} from '@/domain/ports/liquidity';
import { E, Fn } from '@/lib/shared/imports';
import { Db } from '../db';
import { markets, liquidityPositions } from '../schema';

const errMapper =
  (WrappedError: typeof InfraNotFoundError | typeof InfraError) => (cause: unknown) =>
    new PortError({ cause: new WrappedError({ cause }) });

// ── Liquidity Market ─────────────────────────────────────────────────

export const liquidityMarketWriteRepo: LiquidityMarketWriteRepoDomain<Db> = {
  updateMarketLiquidity: (o: UpdateMarketLiquidityParams) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db
              .update(markets)
              .set({
                ammReserveBase: o.ammReserveBase,
                ammReserveQuote: o.ammReserveQuote,
                totalLpTokens: o.totalLpTokens,
                status: o.status,
              })
              .where(eq(markets.id, o.marketId)),
          catch: errMapper(InfraError),
        }),
      ),
      E.asVoid,
    ),

  activatePendingPositions: (marketId: MarketId, lockedUntil: Date) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db
              .update(liquidityPositions)
              .set({ lockedUntil })
              .where(
                sql`${liquidityPositions.marketId} = ${marketId} AND ${liquidityPositions.lockedUntil} IS NULL AND ${liquidityPositions.status} = 'active'`,
              ),
          catch: errMapper(InfraError),
        }),
      ),
      E.asVoid,
    ),
};

// ── Liquidity Position ───────────────────────────────────────────────

export const liquidityPositionWriteRepo: LiquidityPositionWriteRepoDomain<Db> = {
  createPosition: (o: CreateLiquidityPositionParams) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db.insert(liquidityPositions).values({
              marketId: o.marketId,
              userId: o.userId,
              lpTokens: o.lpTokens,
              depositBase: o.depositBase,
              depositQuote: o.depositQuote,
              lockedUntil: o.lockedUntil,
            }),
          catch: errMapper(InfraError),
        }),
      ),
      E.asVoid,
    ),
};
