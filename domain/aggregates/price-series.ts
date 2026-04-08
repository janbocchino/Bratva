// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import type { AssetId } from '../values/asset';
import type { QuoteAmount } from '../values/currencies';
import type { PriceSeriesId, PriceSeriesPublicId } from '../values/price-series';

export type PriceSeries = {
  id: PriceSeriesId;
  publicId: PriceSeriesPublicId;
  assetId: AssetId;
  price: QuoteAmount;
  createdAt: Date;
};
// end of LLM written Code
