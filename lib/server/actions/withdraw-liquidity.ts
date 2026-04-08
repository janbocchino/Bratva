// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
'use server';

import { E, Fn } from '@/lib/shared/imports';
import { creditUserBalance } from '@/domain/workflows/ledger';
import { executeWithdraw } from '@/domain/workflows/liquidity';
import { transitionMarket } from '@/domain/workflows/market';
import { PositionOwnershipError } from '@/domain/errors';
import { TokenAmount, QuoteAmount } from '@/domain/values/currencies';
import { PROTOCOL_USER_ID } from '@/domain/values/protocol';
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

          return Fn.pipe(
            executeWithdraw({ market, position, currentTimestamp: now }),
            E.flatMap((result) => {
              const marketTransition = transitionMarket(market, {
                _tag: 'LiquidityWithdrawn',
                result,
                occurredAt: now,
              });
              const baseAsset = assetReadRepo.getAsset({ id: market.baseAssetId });
              const quoteAsset = assetReadRepo.getAsset({ id: market.quoteAssetId });

              return Fn.pipe(
                E.all({ baseAsset, quoteAsset }),
                E.flatMap(({ baseAsset, quoteAsset }) =>
                  Fn.pipe(
                    marketTransition,
                    E.flatMap((nextMarket) => {
                      const effects: E.Effect<void, any, Db>[] = [];

                      if (result.shareBase.amount > 0n) {
                        effects.push(
                          Fn.pipe(
                            creditUserBalance({
                              userId: user.id,
                              assetId: baseAsset.id,
                              amount: TokenAmount.new(result.shareBase.amount),
                              units: 'scaled_unit',
                            }),
                            E.flatMap(ledgerWriteRepo.createEntry),
                          ),
                        );
                      }

                      if (result.shareQuote.amount > 0n) {
                        effects.push(
                          Fn.pipe(
                            creditUserBalance({
                              userId: user.id,
                              assetId: quoteAsset.id,
                              amount: QuoteAmount.new(result.shareQuote.amount),
                              units: 'scaled_unit',
                            }),
                            E.flatMap(ledgerWriteRepo.createEntry),
                          ),
                        );
                      }

                      const totalDust = result.shareBase.dust + result.shareQuote.dust;
                      if (totalDust > 0n) {
                        effects.push(
                          Fn.pipe(
                            creditUserBalance({
                              userId: PROTOCOL_USER_ID,
                              assetId: quoteAsset.id,
                              amount: QuoteAmount.new(totalDust),
                              units: 'scaled_unit',
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
                            wasPreviouslyActive: nextMarket.wasPreviouslyActive,
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
