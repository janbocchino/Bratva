// beginning of LLM written Code, Model: gpt-5.3-codex
/*
Decision questionnaire
- How to keep history implementation reusable?
  - [x] Reuse existing repos (ledger, exchange, liquidity, market, asset).
  - [ ] Re-query all tables directly in this module.
*/
import { composeAccountHistory } from '@/domain/workflows/account-history';
import { PortError, InfraError, InfraNotFoundError } from '@/domain/errors';
import type { AccountHistoryReadRepo as AccountHistoryReadRepoDomain } from '@/domain/ports/account-history';
import { E, Fn } from '@/lib/shared/imports';
import { Db } from '../db';
import { assetReadRepo } from './asset';
import { transactionReadRepo } from './exchange';
import { ledgerReadRepo } from './ledger';
import { liquidityPositionReadRepo } from './liquidity';
import { marketReadRepo } from './market';

const errMapper =
  (WrappedError: typeof InfraNotFoundError | typeof InfraError) => (cause: unknown) =>
    new PortError({ cause: new WrappedError({ cause }) });

export const accountHistoryReadRepo: AccountHistoryReadRepoDomain<Db> = {
  getHistoryByUserId: (userId) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap(() =>
        E.all({
          ledger: Fn.pipe(
            ledgerReadRepo.getLedgerByUserId(userId),
            E.catchAll(() =>
              E.succeed({
                userId,
                summary: [],
                transactions: [],
              }),
            ),
          ),
          trades: transactionReadRepo.listByUserId(userId),
          liquidityPositions: liquidityPositionReadRepo.getPositionsByUserId(userId),
          markets: marketReadRepo.listMarkets(),
          usdAssetId: Fn.pipe(
            assetReadRepo.getAsset({ ticker: 'usd' }),
            E.map((asset) => asset.id),
            E.catchAll(() => E.succeed(null)),
          ),
        }),
      ),
      E.map(({ ledger, trades, liquidityPositions, markets, usdAssetId }) =>
        composeAccountHistory({
          userId,
          ledger: ledger.transactions,
          trades,
          liquidityPositions,
          markets,
          usdAssetId,
        }),
      ),
    ),
};
// end of LLM written Code
