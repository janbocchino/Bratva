// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import type { TokenAmount, QuoteAmount, LpTokens } from '../values/currencies';
import type { MarketId } from '../values/exchange';
import type { UserId } from '../values/user';

export type LiquidityPositionStatus = 'active' | 'withdrawn';

export type LiquidityPosition = {
  id: number;
  publicId: string;
  marketId: MarketId;
  userId: UserId;
  lpTokens: LpTokens;
  depositBase: TokenAmount;
  depositQuote: QuoteAmount;
  lockedUntil: Date | null;
  status: LiquidityPositionStatus;
  createdAt: Date;
  updatedAt: Date;
};
// end of LLM written Code
