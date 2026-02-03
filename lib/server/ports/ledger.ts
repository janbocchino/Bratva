import { asc, eq } from 'drizzle-orm';
import {
	InfraError,
	InfraNotFoundError,
	PortError,
} from '@/domain/ports/errors';
import type { LedgerReadRepo as LedgerReadRepoDomain } from '@/domain/ports/ledger';
import { E, Fn } from '@/lib/shared/imports';
import { Db } from '../db';
import { ledgerEntriesWithBalance } from '../schema';
import { ledgerEntryMapper } from './mapper';

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
							.from(ledgerEntriesWithBalance)
							.where(eq(ledgerEntriesWithBalance.userId, userId))
							.orderBy(asc(ledgerEntriesWithBalance.createdAt)),
					catch: errMapper(InfraError),
				}),
			),
			E.map((rows) => ledgerEntryMapper.toDomain(rows)),
		),
};
