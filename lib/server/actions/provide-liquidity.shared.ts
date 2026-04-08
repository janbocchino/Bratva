// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import type { Market } from '@/domain/aggregates/market';
import { selectMarketDisplayPrice } from '@/domain/workflows/price';
import type { AssetId } from '@/domain/values/asset';

export const buildLiquidityPriceSeriesPoint = (o: {
  assetId: AssetId;
  market: Market;
  createdAt: Date;
}) => ({
  assetId: o.assetId,
  price: selectMarketDisplayPrice(o.market),
  createdAt: o.createdAt,
});
// end of LLM written Code
