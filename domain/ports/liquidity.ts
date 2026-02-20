import type { E } from '@/lib/shared/imports';
import type { PortError } from '../errors';
import type { MarketId } from '../values/exchange';
import type { UserId } from '../values/user';

// ── Liquidity ────────────────────────────────────────────────────────

export type CreateLiquidityPositionParams = {
  marketId: MarketId;
  userId: UserId;
  lpTokens: bigint;
  depositBase: bigint;
  depositQuote: bigint;
  lockedUntil: Date | null;
};

export type UpdateMarketLiquidityParams = {
  marketId: MarketId;
  ammReserveBase: bigint;
  ammReserveQuote: bigint;
  totalLpTokens: bigint;
  status: 'pending' | 'active' | 'closed';
};

export interface LiquidityPositionWriteRepo<D> {
  createPosition(o: CreateLiquidityPositionParams): E.Effect<void, PortError, D>;
}

export interface LiquidityMarketWriteRepo<D> {
  updateMarketLiquidity(o: UpdateMarketLiquidityParams): E.Effect<void, PortError, D>;
  activatePendingPositions(marketId: MarketId, lockedUntil: Date): E.Effect<void, PortError, D>;
}
