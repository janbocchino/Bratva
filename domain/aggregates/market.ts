// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import type { AssetId } from '../values/asset';
import type { QuoteAmount, TokenAmount, LpTokens } from '../values/currencies';
import type { MarketId, MarketPublicId, MarketSequenceNumber } from '../values/market';

export type MarketStatus = 'closed' | 'pending' | 'active';

export type AmmPool = {
  reserveBase: TokenAmount;
  reserveQuote: QuoteAmount;
};

export const AmmPool = {
  k: (p: AmmPool) => BigInt(p.reserveBase) * BigInt(p.reserveQuote),
};

export type Market = {
  id: MarketId;
  publicId: MarketPublicId;
  baseAssetId: AssetId;
  quoteAssetId: AssetId;
  sequenceNumber: MarketSequenceNumber;
  ammPool: AmmPool;
  modelPrice: QuoteAmount;
  totalLpTokens: LpTokens;
  status: MarketStatus;
  wasPreviouslyActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
// end of LLM written Code
