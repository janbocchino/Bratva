import { asc, eq } from 'drizzle-orm';
import {
	InfraError,
	InfraNotFoundError,
	PortError,
} from '@/domain/ports/errors';
import type {
	LedgerReadRepo as LedgerReadRepoDomain,
	LedgerWriteRepo as LedgerWriteRepoDomain,
} from '@/domain/ports/ledger';
import { E, Fn } from '@/lib/shared/imports';
import { Db } from '../db';
import { ledgerEntries } from '../schema';
import { ledgerEntriesToDomain } from './mapper';

const errMapper =
	(WrappedError: typeof InfraNotFoundError | typeof InfraError) =>
	(cause: unknown) =>
		new PortError({ cause: new WrappedError({ cause }) });

export const ledgerReadRepo: LedgerReadRepoDomain<Db> = {
	getLedgerByUserId: (userId) =>
		Fn.pipe(
			E.serviceOptional(Db),
			E.mapError(errMapper(InfraNotFoundError)),
			E.flatMap((db) =>
				E.tryPromise({
					try: () =>
						db
							.select()
							.from(ledgerEntries)
							.where(eq(ledgerEntries.userId, userId))
							.orderBy(asc(ledgerEntries.createdAt)),
					catch: errMapper(InfraError),
				}),
			),
			E.map((rows) => ledgerEntriesToDomain({ userId, rows })),
		),
};

export const ledgerWriteRepo: LedgerWriteRepoDomain<Db> = {
	createEntry: (o) =>
		Fn.pipe(
			E.serviceOptional(Db),
			E.mapError(errMapper(InfraNotFoundError)),
			E.flatMap((db) =>
				E.tryPromise({
					try: () =>
						db.insert(ledgerEntries).values({
							userId: o.userId,
							assetId: o.assetId,
							drCr: o.drCr,
							amount: o.amount,
							units: o.units,
						}),
					catch: errMapper(InfraError),
				}),
			),
			E.asVoid,
		),
};
