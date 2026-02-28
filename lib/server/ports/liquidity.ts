import { and, eq, sql } from 'drizzle-orm';
import type { MarketId } from '@/domain/values/exchange';
import type { UserId } from '@/domain/values/user';
import type { LiquidityPosition } from '@/domain/aggregates/liquidity';
import { Cent, Units } from '@/domain/values/currencies';
import {
  InfraError,
  InfraNotFoundError,
  LiquidityPositionNotFoundError,
  PortError,
} from '@/domain/errors';
import type {
  LiquidityPositionReadRepo as LiquidityPositionReadRepoDomain,
  LiquidityPositionWriteRepo as LiquidityPositionWriteRepoDomain,
  LiquidityMarketWriteRepo as LiquidityMarketWriteRepoDomain,
  CreateLiquidityPositionParams,
  UpdateMarketLiquidityParams,
} from '@/domain/ports/liquidity';
import { E, Fn } from '@/lib/shared/imports';
import { Db } from '../db';
import { markets, liquidityPositions } from '../schema';
import type { LiquidityPositionPrs } from '../schema';

const errMapper =
  (WrappedError: typeof InfraNotFoundError | typeof InfraError) => (cause: unknown) =>
    new PortError({ cause: new WrappedError({ cause }) });

// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
function mapPositionToDomain(p: LiquidityPositionPrs): LiquidityPosition {
  return {
    id: p.id,
    publicId: p.publicId,
    marketId: p.marketId as MarketId,
    userId: p.userId as UserId,
    lpTokens: p.lpTokens,
    depositBase: Units(p.depositBase),
    depositQuote: Cent.new(p.depositQuote),
    lockedUntil: p.lockedUntil ? new Date(p.lockedUntil) : null,
    status: p.status,
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
  };
}

// ── Liquidity Position Read ─────────────────────────────────────────

export const liquidityPositionReadRepo: LiquidityPositionReadRepoDomain<Db> = {
  getPosition: (positionId: number) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db.select().from(liquidityPositions).where(eq(liquidityPositions.id, positionId)),
          catch: errMapper(InfraError),
        }),
      ),
      E.flatMap((rows) =>
        rows.length === 0
          ? E.fail(
              new LiquidityPositionNotFoundError({ cause: `Position ${positionId} not found` }),
            )
          : E.succeed(mapPositionToDomain(rows[0])),
      ),
    ),

  getActivePositionsByMarketAndUser: (marketId: MarketId, userId: UserId) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db
              .select()
              .from(liquidityPositions)
              .where(
                and(
                  eq(liquidityPositions.marketId, marketId),
                  eq(liquidityPositions.userId, userId),
                  eq(liquidityPositions.status, 'active'),
                ),
              ),
          catch: errMapper(InfraError),
        }),
      ),
      E.map((rows) => rows.map(mapPositionToDomain)),
    ),
};
// end of LLM written Code

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
                // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
                ...(o.wasPreviouslyActive !== undefined && {
                  wasPreviouslyActive: o.wasPreviouslyActive,
                }),
                // end of LLM written Code
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

  // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
  markWithdrawn: (positionId: number) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db
              .update(liquidityPositions)
              .set({ status: 'withdrawn' })
              .where(eq(liquidityPositions.id, positionId)),
          catch: errMapper(InfraError),
        }),
      ),
      E.asVoid,
    ),
  // end of LLM written Code
};
