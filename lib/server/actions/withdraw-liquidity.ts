// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
'use server';

import { E, Fn } from '@/lib/shared/imports';
import { creditUserBalance } from '@/domain/workflows/ledger';
import { executeWithdraw } from '@/domain/workflows/liquidity';
import { Cent, Units } from '@/domain/values/currencies';
import { Db, db } from '../db';
import { ledgerWriteRepo } from '../ports/ledger';
import { userReadRepo } from '../ports/user';
import { marketReadRepo } from '../ports/exchange';
import {
  liquidityMarketWriteRepo,
  liquidityPositionReadRepo,
  liquidityPositionWriteRepo,
} from '../ports/liquidity';
import { assetReadRepo } from '../ports/asset';

export async function withdrawLiquidityAction(p: { userId: number; positionId: number }) {
  const user = Fn.pipe(
    E.succeed(p.userId),
    E.flatMap((id) => userReadRepo.getUser({ id })),
  );

  const position = liquidityPositionReadRepo.getPosition(p.positionId);

  const pipeline = Fn.pipe(
    E.all({ user, position }),
    E.flatMap(({ user, position }) => {
      if (position.userId !== user.id) {
        return E.fail(new Error('Position does not belong to user'));
      }
      return Fn.pipe(
        marketReadRepo.getMarket({ id: position.marketId }),
        E.flatMap((market) => {
          const now = new Date();

          // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
          return Fn.pipe(
            executeWithdraw({ market, position, currentTimestamp: now }),
            E.flatMap((result) => {
              // end of LLM written Code
              const baseAsset = assetReadRepo.getAsset({ id: market.baseAssetId });
              const quoteAsset = assetReadRepo.getAsset({ id: market.quoteAssetId });

              return Fn.pipe(
                E.all({ baseAsset, quoteAsset }),
                E.flatMap(({ baseAsset, quoteAsset }) => {
                  const effects: E.Effect<void, any, Db>[] = [];

                  if (result.shareBase > 0n) {
                    effects.push(
                      Fn.pipe(
                        creditUserBalance({
                          userId: user.id,
                          assetId: baseAsset.id,
                          amount: Units(result.shareBase),
                          units: 'unit',
                        }),
                        E.flatMap(ledgerWriteRepo.createEntry),
                      ),
                    );
                  }

                  if (result.shareQuote > 0n) {
                    effects.push(
                      Fn.pipe(
                        creditUserBalance({
                          userId: user.id,
                          assetId: quoteAsset.id,
                          amount: Cent.new(result.shareQuote),
                          units: 'cent',
                        }),
                        E.flatMap(ledgerWriteRepo.createEntry),
                      ),
                    );
                  }

                  const newStatus = result.shouldDeactivateMarket
                    ? ('pending' as const)
                    : market.status;

                  return Fn.pipe(
                    E.all(effects),
                    E.flatMap(() => liquidityPositionWriteRepo.markWithdrawn(position.id)),
                    E.flatMap(() =>
                      liquidityMarketWriteRepo.updateMarketLiquidity({
                        marketId: market.id,
                        ammReserveBase: result.newReserveBase,
                        ammReserveQuote: result.newReserveQuote,
                        totalLpTokens: result.newTotalLpTokens,
                        status: newStatus,
                      }),
                    ),
                    E.map(() => result),
                  );
                }),
              );
            }),
          );
        }),
      );
    }),
  );

  return await pipeline.pipe(E.provideService(Db, db), E.runPromise);
}
// end of LLM written Code
