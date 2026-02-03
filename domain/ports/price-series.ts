import { type } from 'arktype';
import type { E } from '@/lib/shared/imports';
import type { PriceSeries } from '../aggregates/price-series';
import type { AssetId } from '../values/asset';
import type { PortError } from './errors';

export const GetPriceSeriesParams = type({
	id: 'number',
}).or({
	publicId: 'string',
});

export type GetPriceSeriesParams = typeof GetPriceSeriesParams.infer;

export interface PriceSeriesReadRepo<D> {
	getPriceSeries(o: GetPriceSeriesParams): E.Effect<PriceSeries, PortError, D>;
	getPriceSeriesByAssetId(
		assetId: AssetId,
	): E.Effect<PriceSeries[], PortError, D>;
}
