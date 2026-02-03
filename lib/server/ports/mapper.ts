import type { Asset } from '@/domain/aggregates/asset';
import type { PriceSeries } from '@/domain/aggregates/price-series';
import type { User } from '@/domain/aggregates/user';
import type { Mapper as MapperPort } from '@/domain/ports/mapper';
import { AssetId, AssetName, AssetPublicId, AssetTicker } from '@/domain/values/asset';
import { Cent } from '@/domain/values/currencies';
import {
	PriceSeriesId,
	PriceSeriesPublicId,
} from '@/domain/values/price-series';
import {
	UserDisplayName,
	UserEmail,
	UserId,
	UserPublicId,
} from '@/domain/values/user';
import type { AssetPrs, PriceSeriesPrs, UserPrs } from '../schema';

export const userMapper: MapperPort<User, UserPrs> = {
	toDomain: (p) => ({
		id: UserId(p.id),
		publicId: UserPublicId(p.publicId),
		displayName: UserDisplayName(p.displayName),
		email: UserEmail(p.email),
		createdAt: new Date(p.createdAt),
		updatedAt: new Date(p.updatedAt),
	}),
	toPersistence: (d) => ({
		id: d.id,
		publicId: d.publicId,
		displayName: d.displayName,
		email: d.email,
		createdAt: d.createdAt.getTime(),
		updatedAt: d.updatedAt.getTime(),
	}),
};

export const assetMapper: MapperPort<Asset, AssetPrs> = {
	toDomain: (p) => ({
		id: AssetId(p.id),
		publicId: AssetPublicId(p.publicId),
		name: AssetName(p.name),
		ticker: AssetTicker(p.ticker),
		createdAt: new Date(p.createdAt),
		updatedAt: new Date(p.updatedAt),
	}),
	toPersistence: (d) => ({
		id: d.id,
		publicId: d.publicId,
		name: d.name,
		ticker: d.ticker,
		createdAt: d.createdAt.getTime(),
		updatedAt: d.updatedAt.getTime(),
	}),
};

export const priceSeriesMapper: MapperPort<PriceSeries, PriceSeriesPrs> = {
	toDomain: (p) => ({
		id: PriceSeriesId(p.id),
		publicId: PriceSeriesPublicId(p.publicId),
		assetId: AssetId(p.assetId),
		price: Cent.new(p.price),
		createdAt: new Date(p.createdAt),
	}),
	toPersistence: (d) => ({
		id: d.id,
		publicId: d.publicId,
		assetId: d.assetId,
		price: d.price,
		createdAt: d.createdAt.getTime(),
	}),
};
