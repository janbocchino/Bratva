'use server';

import { E, Fn } from '@/lib/shared/imports';
import type { UserLedger } from '@/domain/aggregates/ledger';
import { creditUserBalance } from '@/domain/workflows/ledger';
import { Cent, Dollar } from '@/domain/values/currencies';
import { type } from 'arktype';
import { Db, db } from '../db';
import { assetReadRepo, assetWriteRepo } from '../ports/asset';
import { ledgerReadRepo, ledgerWriteRepo } from '../ports/ledger';
import { userReadRepo } from '../ports/user';


const parseBigint = type("string.trim").pipe((s, ctx) => BigInt(s));

export async function addBalance(p: {
	userId: number;
	amountDollars: string;
}): Promise<UserLedger> {
	const cents = E.try({
		try: () => parseBigint.assert(p.amountDollars),
		catch: () => new Error('Invalid amountDollars'),
	});

	const user = Fn.pipe(
		E.succeed(p.userId),
		E.flatMap((id) => userReadRepo.getUser({ id })),
	);

	const usdAsset = Fn.pipe(
		assetReadRepo.getAsset({ ticker: 'USD' }),
		E.catch('name', {
			failure: 'PortError',
			onFailure: (err) => {
				const cause = (err as { cause?: { name?: string; _tag?: string } }).cause;
				if (
					cause?.name === 'AssetNotFoundError' ||
					cause?._tag === 'AssetNotFoundError'
				) {
					return assetWriteRepo.createAsset({
						name: 'US Dollar',
						ticker: 'USD',
					});
				}
				return E.fail(err);
			},
		}),
	);

	const ledger = Fn.pipe(
		E.all({ cents, user, usdAsset }),
		E.flatMap(({ cents, user, usdAsset }) =>
			creditUserBalance({
				userId: user.id,
				assetId: usdAsset.id,
				amount: Cent.fromDollar(Dollar.new(cents)),
				units: 'cent',
			}),
		),
		E.flatMap(ledgerWriteRepo.createEntry),
		E.flatMap(() => user),
		E.flatMap((u) => ledgerReadRepo.getLedgerByUserId(u.id)),
	);

	return ledger.pipe(E.provideService(Db, db), E.runPromise);
}

