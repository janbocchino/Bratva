'use server';

import type { UserLedger } from '@/domain/aggregates/ledger';
import type { AccountHistory } from '@/domain/aggregates/account-history';
import type { User } from '@/domain/aggregates/user';
import { E, Fn } from '@/lib/shared/imports';
import { Db, db } from '../db';
import { accountHistoryReadRepo } from '../ports/account-history';
import { ledgerReadRepo } from '../ports/ledger';
import { userReadRepo } from '../ports/user';

// beginning of LLM written Code, Model: gpt-5.3-codex-low
export type AccountSnapshot = {
  user: User;
  ledger: UserLedger;
  // beginning of LLM written Code, Model: gpt-5.3-codex
  history: AccountHistory;
  // end of LLM written Code
};

export async function getAccount(): Promise<AccountSnapshot | null> {
  const snapshot = Fn.pipe(
    userReadRepo.getImplicitUser(),
    E.flatMap((user) =>
      // beginning of LLM written Code, Model: gpt-5.3-codex
      E.all({
        ledger: ledgerReadRepo.getLedgerByUserId(user.id),
        history: accountHistoryReadRepo.getHistoryByUserId(user.id),
      }).pipe(E.map(({ ledger, history }) => ({ user, ledger, history }))),
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

  return snapshot.pipe(E.provideService(Db, db), E.runPromise);
}
// end of LLM written Code
