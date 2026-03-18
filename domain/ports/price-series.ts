import { type } from 'arktype';
import type { E } from '@/lib/shared/imports';
import type { PriceSeries } from '../aggregates/price-series';
import type { AssetId } from '../values/asset';
import type { Cent } from '../values/currencies';
import type { PortError } from '../errors';

export const GetPriceSeriesParams = type({
  id: 'number',
}).or({
  publicId: 'string',
});

export type GetPriceSeriesParams = typeof GetPriceSeriesParams.infer;

// beginning of LLM written Code, Model: gpt-5.3-codex
export const CreatePriceSeriesParams = type({
  assetId: 'number',
  price: 'bigint',
  createdAt: 'Date',
});

export type CreatePriceSeriesParams = {
  assetId: AssetId;
  price: Cent;
  createdAt: Date;
};

export const CreatePriceSeriesBatchParams = CreatePriceSeriesParams.array();
export type CreatePriceSeriesBatchParams = readonly CreatePriceSeriesParams[];
// end of LLM written Code

export interface PriceSeriesReadRepo<D> {
  getPriceSeries(o: GetPriceSeriesParams): E.Effect<PriceSeries, PortError, D>;
  getPriceSeriesByAssetId(assetId: AssetId): E.Effect<PriceSeries[], PortError, D>;
}
// beginning of LLM written Code, Model: gpt-5.3-codex
export interface PriceSeriesWriteRepo<D> {
  insertPriceSeriesBatch(o: CreatePriceSeriesBatchParams): E.Effect<PriceSeries[], PortError, D>;
}
// end of LLM written Code

