'use server';

import type { AccountHistory } from '@/domain/aggregates/account-history';
import type { UserLedger } from '@/domain/aggregates/ledger';
import type { User } from '@/domain/aggregates/user';
import type { AssetId } from '@/domain/values/asset';
import { E, Fn } from '@/lib/shared/imports';
import { Db, db } from '../db';
import { accountHistoryReadRepo } from '../ports/account-history';
import { assetReadRepo } from '../ports/asset';
import { ledgerReadRepo } from '../ports/ledger';
import { userReadRepo } from '../ports/user';
import { runServerDomainEffect } from '../run-server-domain-effect';

// beginning of LLM written Code, Model: gpt-5.3-codex-low
export type AccountSnapshot = {
  user: User;
  ledger: UserLedger;
  // beginning of LLM written Code, Model: gpt-5.3-codex
  history: AccountHistory;
  /** Ledger rows for this asset use `QuoteAmount` scale (USD); used to format `scaled_unit` balances. */
  usdAssetId: AssetId | null;
  // end of LLM written Code
};

export async function getAccount(): Promise<AccountSnapshot | null> {
  const snapshot = Fn.pipe(
    userReadRepo.getImplicitUser(),
    E.flatMap(
      (user) =>
        // beginning of LLM written Code, Model: gpt-5.3-codex
        E.all({
          ledger: ledgerReadRepo.getLedgerByUserId(user.id),
          history: accountHistoryReadRepo.getHistoryByUserId(user.id),
          usdAssetId: Fn.pipe(
            assetReadRepo.getAsset({ ticker: 'usd' }),
            E.map((asset) => asset.id),
            E.catchAll(() => E.succeed(null)),
          ),
        }).pipe(
          E.map(({ ledger, history, usdAssetId }) => ({ user, ledger, history, usdAssetId })),
        ),
      // end of LLM written Code
    ),
    E.catch('name', {
      failure: 'PortError',
      onFailure: (err) => {
        const cause = (err as { cause?: { name?: string; _tag?: string } }).cause;
        if (cause?.name === 'UserNotFoundError' || cause?._tag === 'UserNotFoundError') {
          return E.succeed(null);
        }
        return E.fail(err);
      },
    }),
  );

  return runServerDomainEffect(snapshot.pipe(E.provideService(Db, db)));
}
// end of LLM written Code
