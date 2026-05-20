// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
'use server';

import { E, Fn } from '@/lib/shared/imports';
import type { UserLedger } from '@/domain/aggregates/ledger';
import { debitUserBalance } from '@/domain/workflows/ledger';
import { QuoteAmount } from '@/domain/values/currencies';
import { parseFixedPoint } from '@/domain/values/parse-fixed-point';
import { requireUser } from '../auth/guards';
import { Db, db } from '../db';
import { assetReadRepo } from '../ports/asset';
import { ledgerReadRepo, ledgerWriteRepo } from '../ports/ledger';
import { runServerDomainEffect } from '../run-server-domain-effect';

export async function withdrawBalance(p: { amountDollars: string }): Promise<UserLedger> {
  const amount = E.try({
    try: () => QuoteAmount.new(parseFixedPoint(p.amountDollars)),
    catch: () => new Error('Invalid amountDollars'),
  });

  // beginning of LLM written Code, Model: GPT-5.5
  const user = requireUser();
  // end of LLM written Code

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
    E.all({ amount, user, usdAsset, currentLedger }),
    E.flatMap(({ amount, user, usdAsset, currentLedger }) => {
      const usdSummary = currentLedger.summary.find((s) => s.assetId === usdAsset.id);
      const balanceQuote = usdSummary ? usdSummary.balance : QuoteAmount.zero;
      return debitUserBalance({
        userId: user.id,
        assetId: usdAsset.id,
        amount,
        units: 'scaled_unit',
        currentBalance: balanceQuote,
      });
    }),
    E.flatMap(ledgerWriteRepo.createEntry),
    E.flatMap(() => user),
    E.flatMap((u) => ledgerReadRepo.getLedgerByUserId(u.id)),
  );

  return await runServerDomainEffect(ledger.pipe(E.provideService(Db, db)));
}
// end of LLM written Code
