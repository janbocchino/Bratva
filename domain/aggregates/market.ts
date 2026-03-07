import type { AssetId } from '../values/asset';
import type { Cent, Units } from '../values/currencies';
import type { MarketId, MarketPublicId, MarketSequenceNumber } from '../values/market';

// beginning of LLM written Code, Model: Claude
export type MarketStatus = 'closed' | 'pending' | 'active';
// end of LLM written Code

export type AmmPool = {
  reserveBase: Units;
  reserveQuote: Cent;
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
  modelPrice: Cent;
  totalLpTokens: bigint;
  status: MarketStatus;
  // beginning of LLM written Code, Model: Claude
  wasPreviouslyActive: boolean;
  // end of LLM written Code
  createdAt: Date;
  updatedAt: Date;
};
