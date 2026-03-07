import type { AssetId } from '../values/asset';
import type { Cent } from '../values/currencies';
import type { PriceSeriesId, PriceSeriesPublicId } from '../values/price-series';

export type PriceSeries = {
  id: PriceSeriesId;
  publicId: PriceSeriesPublicId;
  assetId: AssetId;
  price: Cent;
  createdAt: Date;
};
