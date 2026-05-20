// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
'use server';

import { E, Fn } from '@/lib/shared/imports';
import type { UserLedger } from '@/domain/aggregates/ledger';
import { creditUserBalance } from '@/domain/workflows/ledger';
import { QuoteAmount } from '@/domain/values/currencies';
import { parseFixedPoint } from '@/domain/values/parse-fixed-point';
import { requireUser } from '../auth/guards';
import { Db, db } from '../db';
import { assetReadRepo } from '../ports/asset';
import { ledgerReadRepo, ledgerWriteRepo } from '../ports/ledger';
import { runServerDomainEffect } from '../run-server-domain-effect';

export async function addBalance(p: { amountDollars: string }): Promise<UserLedger> {
  const amount = E.try({
    try: () => QuoteAmount.new(parseFixedPoint(p.amountDollars)),
    catch: () => new Error('Invalid amountDollars'),
  });

  // beginning of LLM written Code, Model: GPT-5.5
  const user = requireUser();
  // end of LLM written Code

  const usdAsset = Fn.pipe(assetReadRepo.getAsset({ ticker: 'usd' }));

  const ledger = Fn.pipe(
    E.all({ amount, user, usdAsset }),
    E.flatMap(({ amount, user, usdAsset }) =>
      creditUserBalance({
        userId: user.id,
        assetId: usdAsset.id,
        amount,
        units: 'scaled_unit',
      }),
    ),
    E.flatMap(ledgerWriteRepo.createEntry),
    E.flatMap(() => user),
    E.flatMap((u) => ledgerReadRepo.getLedgerByUserId(u.id)),
  );

  return await runServerDomainEffect(ledger.pipe(E.provideService(Db, db)));
}
// end of LLM written Code
