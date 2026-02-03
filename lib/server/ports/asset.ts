import { eq } from 'drizzle-orm';
import type { Asset } from '@/domain/aggregates/asset';
import {
	AssetNotFoundError,
	InfraError,
	InfraNotFoundError,
	PortError,
} from '@/domain/ports/errors';
import type { AssetReadRepo as AssetReadRepoDomain } from '@/domain/ports/asset';
import {
	AssetId,
	AssetName,
	AssetPublicId,
	AssetTicker,
} from '@/domain/values/asset';
import { A, E, Fn } from '@/lib/shared/imports';
import { Db } from '../db';
import { assets } from '../schema';

const errMapper =
	(
		WrappedError:
			| typeof InfraNotFoundError
			| typeof InfraError
			| typeof AssetNotFoundError,
	) =>
	(cause: unknown) =>
		new PortError({ cause: new WrappedError({ cause }) });

export const assetReadRepo: AssetReadRepoDomain<Db> = {
	getAsset: (o) =>
		Fn.pipe(
			E.serviceOptional(Db),
			E.mapError(errMapper(InfraNotFoundError)),
			E.flatMap((db) =>
				E.tryPromise({
					try: () => {
						let query;

						if ('id' in o) query = eq(assets.id, o.id);
						else if ('publicId' in o) query = eq(assets.publicId, o.publicId);
						else query = eq(assets.ticker, o.ticker);

						return db.select().from(assets).where(query).limit(1);
					},
					catch: errMapper(InfraError),
				}),
			),
			E.flatMap((rows) =>
				Fn.pipe(A.head(rows), E.mapError(errMapper(AssetNotFoundError))),
			),
			E.map(
				(row): Asset => ({
					id: AssetId(row.id),
					publicId: AssetPublicId(row.publicId),
					name: AssetName(row.name),
					ticker: AssetTicker(row.ticker),
					createdAt: new Date(row.createdAt),
					updatedAt: new Date(row.updatedAt),
				}),
			),
		),
};
