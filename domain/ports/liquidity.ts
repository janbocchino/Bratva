import type { E } from '@/lib/shared/imports';
import type { LiquidityPosition } from '../aggregates/liquidity';
import type { PortError, LiquidityPositionNotFoundError } from '../errors';
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
  // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
  wasPreviouslyActive?: boolean;
  // end of LLM written Code
};

// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
export interface LiquidityPositionReadRepo<D> {
  getPosition(positionId: number): E.Effect<LiquidityPosition, LiquidityPositionNotFoundError | PortError, D>;
  getActivePositionsByMarketAndUser(
    marketId: MarketId,
    userId: UserId,
  ): E.Effect<LiquidityPosition[], PortError, D>;
}
// end of LLM written Code

export interface LiquidityPositionWriteRepo<D> {
  createPosition(o: CreateLiquidityPositionParams): E.Effect<void, PortError, D>;
  // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
  markWithdrawn(positionId: number): E.Effect<void, PortError, D>;
  // end of LLM written Code
}

export interface LiquidityMarketWriteRepo<D> {
  updateMarketLiquidity(o: UpdateMarketLiquidityParams): E.Effect<void, PortError, D>;
  activatePendingPositions(marketId: MarketId, lockedUntil: Date): E.Effect<void, PortError, D>;
}
