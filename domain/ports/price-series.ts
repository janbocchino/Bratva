// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import { type } from 'arktype';
import type { E } from '@/lib/shared/imports';
import type { PriceSeries } from '../aggregates/price-series';
import type { AssetId } from '../values/asset';
import type { QuoteAmount } from '../values/currencies';
import type { PortError } from '../errors';

export const GetPriceSeriesParams = type({
  id: 'number',
}).or({
  publicId: 'string',
});

export type GetPriceSeriesParams = typeof GetPriceSeriesParams.infer;

export type CreatePriceSeriesParams = {
  assetId: AssetId;
  price: QuoteAmount;
  createdAt: Date;
};

export const CreatePriceSeriesBatchParams = type({
  assetId: 'number',
  price: 'bigint',
  createdAt: 'Date',
}).array();
export type CreatePriceSeriesBatchParams = readonly CreatePriceSeriesParams[];

export interface PriceSeriesReadRepo<D> {
  getPriceSeries(o: GetPriceSeriesParams): E.Effect<PriceSeries, PortError, D>;
  getPriceSeriesByAssetId(assetId: AssetId): E.Effect<PriceSeries[], PortError, D>;
  getLatestPriceByAssetId(assetId: AssetId): E.Effect<PriceSeries | null, PortError, D>;
}

export interface PriceSeriesWriteRepo<D> {
  insertPriceSeriesBatch(o: CreatePriceSeriesBatchParams): E.Effect<PriceSeries[], PortError, D>;
}
// end of LLM written Code
