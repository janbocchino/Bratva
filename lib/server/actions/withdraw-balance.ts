'use server';

import { E, Fn } from '@/lib/shared/imports';
import type { UserLedger } from '@/domain/aggregates/ledger';
import { debitUserBalance } from '@/domain/workflows/ledger';
import { Cent } from '@/domain/values/currencies';
import { Db, db } from '../db';
import { assetReadRepo } from '../ports/asset';
import { type } from 'arktype';
import { ledgerReadRepo, ledgerWriteRepo } from '../ports/ledger';
import { userReadRepo } from '../ports/user';

export async function withdrawBalance(p: {
  userId: number;
  amountDollars: string;
}): Promise<UserLedger> {
  const cents = E.try({
    try: () =>
      type('string.numeric.parse |> number > 0')
        .pipe((n) => n * 100)
        .pipe(BigInt)
        .assert(p.amountDollars),
    catch: () => new Error('Invalid amountDollars'),
  });

  const user = Fn.pipe(
    E.succeed(p.userId),
    E.flatMap((id) => userReadRepo.getUser({ id })),
  );

  const usdAsset = assetReadRepo.getAsset({ ticker: 'usd' });

  const currentLedger = Fn.pipe(
    user,
    E.flatMap((u) =>
      Fn.pipe(
        ledgerReadRepo.getLedgerByUserId(u.id),
        E.catchAll(() =>
          E.succeed({
            userId: u.id,
            summary: [],
            transactions: [],
          } satisfies UserLedger),
        ),
      ),
    ),
  );

  const ledger = Fn.pipe(
    E.all({ cents, user, usdAsset, currentLedger }),
    E.flatMap(({ cents, user, usdAsset, currentLedger }) => {
      const usdSummary = currentLedger.summary.find((s) => s.assetId === usdAsset.id);
      const balanceCents = usdSummary ? usdSummary.balance : (0n as Cent);
      return debitUserBalance({
        userId: user.id,
        assetId: usdAsset.id,
        amount: Cent.new(cents),
        units: 'cent',
        currentBalance: balanceCents,
      });
    }),
    E.flatMap(ledgerWriteRepo.createEntry),
    E.flatMap(() => user),
    E.flatMap((u) => ledgerReadRepo.getLedgerByUserId(u.id)),
  );

  return await ledger.pipe(E.provideService(Db, db), E.runPromise);
}
