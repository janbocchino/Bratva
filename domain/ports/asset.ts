import { type } from 'arktype';
import type { E } from '@/lib/shared/imports';
import type { Asset } from '../aggregates/asset';
import type { PortError } from './errors';

export const GetAssetParams = type({
	id: 'number',
})
	.or({
		publicId: 'string',
	})
	.or({
		ticker: 'string',
	});

export type GetAssetParams = typeof GetAssetParams.infer;

export interface AssetReadRepo<D> {
	getAsset(o: GetAssetParams): E.Effect<Asset, PortError, D>;
}
