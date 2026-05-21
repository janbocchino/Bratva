'use server';

import type { AccountHistory } from '@/domain/aggregates/account-history';
import type { UserLedger } from '@/domain/aggregates/ledger';
import type { User } from '@/domain/aggregates/user';
import type { AssetId } from '@/domain/values/asset';
import { E, Fn } from '@/lib/shared/imports';
import { Db, db } from '../db';
import { requireUser } from '../auth/guards';
import { accountHistoryReadRepo } from '../ports/account-history';
import { assetReadRepo } from '../ports/asset';
import { ledgerReadRepo } from '../ports/ledger';
// beginning of LLM written Code, Model: GPT-5.5
import { liquidityPositionReadRepo } from '../ports/liquidity';
// end of LLM written Code
import { runServerDomainEffect } from '../run-server-domain-effect';
// beginning of LLM written Code, Model: Claude Opus 4.7
import { listOpenOrders, type OpenOrderRow } from './list-open-orders';
// end of LLM written Code

// beginning of LLM written Code, Model: gpt-5.3-codex-low
export type AccountSnapshot = {
  user: User;
  ledger: UserLedger;
  // beginning of LLM written Code, Model: gpt-5.3-codex
  history: AccountHistory;
  /** Ledger rows for this asset use `QuoteAmount` scale (USD); used to format `scaled_unit` balances. */
  usdAssetId: AssetId | null;
  // end of LLM written Code
  // beginning of LLM written Code, Model: Claude Opus 4.7
  openOrders: readonly OpenOrderRow[];
  // end of LLM written Code
  // beginning of LLM written Code, Model: GPT-5.5
  activeLiquidityMarketIds: readonly number[];
  // end of LLM written Code
};

export async function getAccount(): Promise<AccountSnapshot | null> {
  const snapshot = Fn.pipe(
    // beginning of LLM written Code, Model: GPT-5.5
    requireUser(),
    // end of LLM written Code
    E.flatMap(
      (user) =>
        // beginning of LLM written Code, Model: gpt-5.3-codex
        E.all({
          ledger: ledgerReadRepo.getLedgerByUserId(user.id),
          history: accountHistoryReadRepo.getHistoryByUserId(user.id),
          // beginning of LLM written Code, Model: GPT-5.5
          activeLiquidityMarketIds: Fn.pipe(
            liquidityPositionReadRepo.getPositionsByUserId(user.id),
            E.map((positions) =>
              Array.from(
                new Set(
                  positions
                    .filter((position) => position.status === 'active')
                    .map((position) => Number(position.marketId)),
                ),
              ),
            ),
          ),
          // end of LLM written Code
          usdAssetId: Fn.pipe(
            assetReadRepo.getAsset({ ticker: 'usd' }),
            E.map((asset) => asset.id),
            E.catchAll(() => E.succeed(null)),
          ),
        }).pipe(
          E.map(
            // beginning of LLM written Code, Model: GPT-5.5
            ({ ledger, history, activeLiquidityMarketIds, usdAssetId }) => ({
              user,
              ledger,
              history,
              activeLiquidityMarketIds,
              usdAssetId,
            }),
            // end of LLM written Code
          ),
        ),
      // end of LLM written Code
    ),
    // beginning of LLM written Code, Model: GPT-5.5
    E.catchAll((err) => {
      const direct = err as {
        name?: string;
        _tag?: string;
        cause?: { name?: string; _tag?: string };
      };
      const cause = direct.cause;
      const tag = direct.name ?? direct._tag ?? cause?.name ?? cause?._tag;
      if (
        tag === 'UserNotFoundError' ||
        tag === 'AuthenticationRequiredError' ||
        tag === 'InvalidSessionError'
      ) {
        return E.succeed(null);
      }
      return E.fail(err);
    }),
    // end of LLM written Code
  );

  const base = await runServerDomainEffect(snapshot.pipe(E.provideService(Db, db)));
  if (base === null) return null;

  // beginning of LLM written Code, Model: Claude Opus 4.7
  // `listOpenOrders` is a `'use server'` action with its own effect runner and
  // the user's id is only known after the implicit-user lookup, so we fan out
  // the read here rather than threading it through the single Effect pipeline.
  const openOrders = await listOpenOrders();
  return { ...base, openOrders };
  // end of LLM written Code
}
// end of LLM written Code
