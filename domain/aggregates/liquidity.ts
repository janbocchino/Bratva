import type { Cent, Units } from '../values/currencies';
import type { MarketId } from '../values/exchange';
import type { UserId } from '../values/user';

export type LiquidityPositionStatus = 'active' | 'withdrawn';

export type LiquidityPosition = {
  id: number;
  publicId: string;
  marketId: MarketId;
  userId: UserId;
  lpTokens: bigint;
  depositBase: Units;
  depositQuote: Cent;
  lockedUntil: Date | null;
  status: LiquidityPositionStatus;
  createdAt: Date;
  updatedAt: Date;
};
