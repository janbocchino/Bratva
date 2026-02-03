import { AssetId } from "../values/asset";
import { Cent } from "../values/currencies";
import type { PriceSeriesId, PriceSeriesPublicId } from "../values/price-series";

export type PriceSeries = {
  id: PriceSeriesId;
  publicId: PriceSeriesPublicId;
  assetId: AssetId;
  price: Cent;
  createdAt: Date;
}