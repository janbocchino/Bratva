'use server';

import { E, Fn } from '@/lib/shared/imports';
import type { UserLedger } from '@/domain/aggregates/ledger';
import { creditUserBalance } from '@/domain/workflows/ledger';
import { Cent } from '@/domain/values/currencies';
import { Db, db } from '../db';
import { assetReadRepo, assetWriteRepo } from '../ports/asset';
import { ledgerReadRepo, ledgerWriteRepo } from '../ports/ledger';
import { userReadRepo } from '../ports/user';

function parseAmountDollarsToCents(amountDollars: string): bigint {
	const s = amountDollars.trim();
	// Supports: "10", "10.0", "10.00"
	const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
	if (!m) throw new Error('Invalid amountDollars');

	const dollars = BigInt(m[1]);
	const centsPart = (m[2] ?? '').padEnd(2, '0');
	const cents = BigInt(centsPart === '' ? '0' : centsPart);
	const total = dollars * 100n + cents;
	if (total <= 0n) throw new Error('Invalid amountDollars');
	return total;
}

export async function addBalance(p: {
	userId: number;
	amountDollars: string;
}): Promise<UserLedger> {
	const cents = E.try({
		try: () => parseAmountDollarsToCents(p.amountDollars),
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
				amount: Cent.new(cents),
				units: 'cent',
			}),
		),
		E.flatMap(ledgerWriteRepo.createEntry),
		E.flatMap(() => user),
		E.flatMap((u) => ledgerReadRepo.getLedgerByUserId(u.id)),
	);

	return await ledger.pipe(E.provideService(Db, db), E.runPromise);
}

