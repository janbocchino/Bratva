// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
'use server';

import { E, Fn } from '@/lib/shared/imports';
import { creditUserBalance } from '@/domain/workflows/ledger';
import { executeWithdraw } from '@/domain/workflows/liquidity';
import { transitionMarket } from '@/domain/workflows/market';
import { PositionOwnershipError } from '@/domain/errors';
import { Cent, Units } from '@/domain/values/currencies';
import { Db, db } from '../db';
import { ledgerWriteRepo } from '../ports/ledger';
import { userReadRepo } from '../ports/user';
import { marketReadRepo } from '../ports/market';
import {
  liquidityMarketWriteRepo,
  liquidityPositionReadRepo,
  liquidityPositionWriteRepo,
} from '../ports/liquidity';
import { assetReadRepo } from '../ports/asset';
import { runServerDomainEffect } from '../run-server-domain-effect';

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
        return E.fail(new PositionOwnershipError({ positionId: position.id, userId: user.id }));
      }
      return Fn.pipe(
        marketReadRepo.getMarket({ id: position.marketId }),
        E.flatMap((market) => {
          const now = new Date();

          // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
          return Fn.pipe(
            executeWithdraw({ market, position, currentTimestamp: now }),
            E.flatMap((result) => {
              // beginning of LLM written Code, Model: gpt-5.3-codex
              const marketTransition = transitionMarket(market, {
                _tag: 'LiquidityWithdrawn',
                result,
                occurredAt: now,
              });
              // end of LLM written Code
              // end of LLM written Code
              const baseAsset = assetReadRepo.getAsset({ id: market.baseAssetId });
              const quoteAsset = assetReadRepo.getAsset({ id: market.quoteAssetId });

              return Fn.pipe(
                E.all({ baseAsset, quoteAsset }),
                E.flatMap(({ baseAsset, quoteAsset }) =>
                  Fn.pipe(
                    marketTransition,
                    E.flatMap((nextMarket) => {
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

                      return Fn.pipe(
                        E.all(effects),
                        E.flatMap(() => liquidityPositionWriteRepo.markWithdrawn(position.id)),
                        E.flatMap(() =>
                          liquidityMarketWriteRepo.updateMarketLiquidity({
                            marketId: market.id,
                            ammReserveBase: nextMarket.ammPool.reserveBase,
                            ammReserveQuote: nextMarket.ammPool.reserveQuote,
                            totalLpTokens: nextMarket.totalLpTokens,
                            status: nextMarket.status,
                            // beginning of LLM written Code, Model: gpt-5.3-codex
                            wasPreviouslyActive: nextMarket.wasPreviouslyActive,
                            // end of LLM written Code
                          }),
                        ),
                        E.map(() => result),
                      );
                    }),
                  ),
                ),
              );
            }),
          );
        }),
      );
    }),
  );

  return await runServerDomainEffect(pipeline.pipe(E.provideService(Db, db)));
}
// end of LLM written Code
