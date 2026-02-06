import type { Asset } from '@/domain/aggregates/asset';
import type { UserLedger } from '@/domain/aggregates/ledger';
import type { PriceSeries } from '@/domain/aggregates/price-series';
import type { User } from '@/domain/aggregates/user';
import { A } from '@/lib/shared/imports';
import type { Mapper as MapperPort } from '@/domain/ports/mapper';
import {
	AssetId,
	AssetName,
	AssetPublicId,
	AssetTicker,
} from '@/domain/values/asset';
import { Cent, Units } from '@/domain/values/currencies';
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
import type {
	AssetPrs,
	LedgerEntryPrs,
	LedgerEntryWithBalancePrs,
	PriceSeriesPrs,
	UserPrs,
} from '../schema';
import { type } from 'arktype';

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
		createdAt: d.createdAt,
		updatedAt: d.updatedAt,
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
		createdAt: d.createdAt,
		updatedAt: d.updatedAt,
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
		createdAt: d.createdAt,
	}),
};

const balanceToBigInt = type('string.numeric.parse')
	.pipe(Math.trunc)
	.pipe(BigInt);

export const ledgerEntryMapper: MapperPort<
	UserLedger,
	LedgerEntryWithBalancePrs[]
> = {
	toDomain: (p: LedgerEntryWithBalancePrs[]) => ({
		userId: UserId(p[0].userId),
		summary: p.map(({ assetId, balance, units }) => ({
			assetId: AssetId(assetId),
			balance:
				units === 'cent'
					? Cent.new(balanceToBigInt.assert(balance))
					: Units(balanceToBigInt.assert(balance)),
			units: units,
		})),
		transactions: p.map(({ assetId, drCr, amount, units, createdAt }) => ({
			assetId: AssetId(assetId),
			drCr: drCr,
			amount: units == 'cent' ? Cent.new(amount) : Units(amount),
			units: units,
			createdAt,
		})),
	}),
	// @ts-ignore
	toPersistence: (tx: LedgerEntryWithBalancePrs) => {
		throw new Error('Not implemented');
	},
};

export function ledgerEntriesToDomain(o: {
	userId: UserId;
	rows: LedgerEntryPrs[];
}): UserLedger {
	if (o.rows.length === 0) {
		return { userId: o.userId, summary: [], transactions: [] };
	}

	const transactions: UserLedger['transactions'] = o.rows.map((r) => ({
		assetId: AssetId(r.assetId),
		drCr: r.drCr,
		amount: r.units === 'cent' ? Cent.new(r.amount) : Units(r.amount),
		units: r.units,
		createdAt: new Date(r.createdAt as unknown as string | number),
	}));

	// Compute balances grouped by (assetId, units)
	const balances = new Map<string, { assetId: number; units: 'cent' | 'unit'; balance: bigint }>();
	for (const tx of transactions) {
		const assetId = tx.assetId as unknown as number;
		const key = `${assetId}|${tx.units}`;
		const prev = balances.get(key);
		const signed =
			tx.drCr === 'cr'
				? (tx.amount as unknown as bigint)
				: -(tx.amount as unknown as bigint);
		if (!prev) balances.set(key, { assetId, units: tx.units, balance: signed });
		else balances.set(key, { ...prev, balance: prev.balance + signed });
	}

	const summary: UserLedger['summary'] = Array.from(balances.values()).map(
		({ assetId, units, balance }) => ({
			assetId: AssetId(assetId),
			balance: units === 'cent' ? Cent.new(balance) : Units(balance),
			units,
		}),
	);

	return { userId: o.userId, summary, transactions };
}
