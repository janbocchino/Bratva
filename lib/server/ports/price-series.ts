import { asc, eq } from 'drizzle-orm';
import {
	InfraError,
	InfraNotFoundError,
	PortError,
	PriceSeriesNotFoundError,
} from '@/domain/ports/errors';
import type { PriceSeriesReadRepo as PriceSeriesReadRepoDomain } from '@/domain/ports/price-series';
import { A, E, Fn } from '@/lib/shared/imports';
import { Db } from '../db';
import { priceSeriesMapper } from './mapper';
import { priceSeries } from '../schema';

const errMapper =
	(
		WrappedError:
			| typeof InfraNotFoundError
			| typeof InfraError
			| typeof PriceSeriesNotFoundError,
	) =>
	(cause: unknown) =>
		new PortError({ cause: new WrappedError({ cause }) });

export const priceSeriesReadRepo: PriceSeriesReadRepoDomain<Db> = {
	getPriceSeries: (o) =>
		Fn.pipe(
			E.serviceOptional(Db),
			E.mapError(errMapper(InfraNotFoundError)),
			E.flatMap((db) =>
				E.tryPromise({
					try: () => {
						const query =
							'id' in o
								? eq(priceSeries.id, o.id)
								: eq(priceSeries.publicId, o.publicId);
						return db
							.select()
							.from(priceSeries)
							.where(query)
							.limit(1);
					},
					catch: errMapper(InfraError),
				}),
			),
			E.flatMap((rows) =>
				Fn.pipe(
					A.head(rows),
					E.mapError(errMapper(PriceSeriesNotFoundError)),
				),
			),
			E.map(priceSeriesMapper.toDomain),
		),
	getPriceSeriesByAssetId: (assetId) =>
		Fn.pipe(
			E.serviceOptional(Db),
			E.mapError(errMapper(InfraNotFoundError)),
			E.flatMap((db) =>
				E.tryPromise({
					try: () =>
						db
							.select()
							.from(priceSeries)
							.where(eq(priceSeries.assetId, assetId))
							.orderBy(asc(priceSeries.createdAt)),
					catch: errMapper(InfraError),
				}),
			),
			E.map((rows) => rows.map(priceSeriesMapper.toDomain)),
		),
};
