// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
'use server';

import { E, Fn } from '@/lib/shared/imports';
import type { UserLedger } from '@/domain/aggregates/ledger';
import { debitUserBalance, creditUserBalance } from '@/domain/workflows/ledger';
import { provideLiquidity, validateProvide, LOCK_DURATION_MS } from '@/domain/workflows/liquidity';
import { transitionMarket } from '@/domain/workflows/market';
import { selectMarketDisplayPrice } from '@/domain/workflows/price';
import { TokenAmount, QuoteAmount, SCALE } from '@/domain/values/currencies';
import { mulDivDown } from '@/domain/values/fixed-point';
import { PROTOCOL_USER_ID } from '@/domain/values/protocol';
import { parseFixedPoint } from '@/domain/values/parse-fixed-point';
import { requireUser } from '../auth/guards';
import { Db, db } from '../db';
import { buildLiquidityPriceSeriesPoint } from './provide-liquidity.shared';
import { assetReadRepo } from '../ports/asset';
import { type } from 'arktype';
import { ledgerReadRepo, ledgerWriteRepo } from '../ports/ledger';
import { marketReadRepo } from '../ports/market';
import { liquidityMarketWriteRepo, liquidityPositionWriteRepo } from '../ports/liquidity';
import { priceSeriesWriteRepo } from '../ports/price-series';
import { runServerDomainEffect } from '../run-server-domain-effect';

export async function provideLiquidityAction(p: { marketPublicId: string; amountDollars: string }) {
  const quoteAmount = E.try({
    try: () => QuoteAmount.new(parseFixedPoint(p.amountDollars)),
    catch: () => new Error('Invalid amountDollars'),
  });

  // beginning of LLM written Code, Model: GPT-5.5
  const user = requireUser();
  // end of LLM written Code

  const usdAsset = assetReadRepo.getAsset({ ticker: 'usd' });

  const market = marketReadRepo.getMarket({ publicId: p.marketPublicId });

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

  const result = Fn.pipe(
    E.all({ quoteAmount, user, usdAsset, market, currentLedger }),
    E.flatMap(({ quoteAmount, user, usdAsset, market, currentLedger }) => {
      const price = BigInt(selectMarketDisplayPrice(market));
      if (price <= 0n) return E.fail(new Error('Market price must be > 0'));
      const halfQuote = BigInt(quoteAmount) / 2n;
      const baseAmount = TokenAmount.new(mulDivDown(halfQuote, SCALE, price));
      const depositQuote = QuoteAmount.new(halfQuote);

      return Fn.pipe(
        validateProvide({
          market,
          amountBase: baseAmount,
          amountQuote: depositQuote,
        }),
        E.flatMap(() => {
          const usdSummary = currentLedger.summary.find((s) => s.assetId === usdAsset.id);
          const balanceQuote = usdSummary ? usdSummary.balance : QuoteAmount.zero;
          return debitUserBalance({
            userId: user.id,
            assetId: usdAsset.id,
            amount: quoteAmount,
            units: 'scaled_unit',
            currentBalance: balanceQuote,
          });
        }),
        E.flatMap(ledgerWriteRepo.createEntry),
        E.map(() => {
          const now = new Date();
          return provideLiquidity({
            market,
            amountBase: baseAmount,
            amountQuote: depositQuote,
            currentTimestamp: now,
          });
        }),
        E.flatMap((lpResult) =>
          Fn.pipe(
            transitionMarket(market, {
              _tag: 'LiquidityProvided',
              result: lpResult,
              occurredAt: lpResult.lockedUntil ?? new Date(),
            }),
            E.flatMap((nextMarket) =>
              Fn.pipe(
                liquidityPositionWriteRepo.createPosition({
                  marketId: market.id,
                  userId: user.id,
                  lpTokens: lpResult.lpTokensMinted,
                  depositBase: baseAmount,
                  depositQuote: depositQuote,
                  lockedUntil: lpResult.lockedUntil,
                }),
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
                E.flatMap(() =>
                  Fn.pipe(
                    priceSeriesWriteRepo.insertPriceSeriesBatch([
                      buildLiquidityPriceSeriesPoint({
                        assetId: market.baseAssetId,
                        market: nextMarket,
                        createdAt: new Date(),
                      }),
                    ]),
                    E.asVoid,
                  ),
                ),
                E.flatMap(() => {
                  if (lpResult.lpDust > 0n) {
                    return Fn.pipe(
                      creditUserBalance({
                        userId: PROTOCOL_USER_ID,
                        assetId: usdAsset.id,
                        amount: QuoteAmount.new(lpResult.lpDust),
                        units: 'scaled_unit',
                      }),
                      E.flatMap(ledgerWriteRepo.createEntry),
                    );
                  }
                  return E.void;
                }),
                E.flatMap(() => {
                  const didActivate = market.status !== 'active' && nextMarket.status === 'active';
                  if (didActivate) {
                    const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
                    return liquidityMarketWriteRepo.activatePendingPositions(
                      market.id,
                      lockedUntil,
                    );
                  }
                  return E.void;
                }),
                E.map(() => lpResult),
              ),
            ),
          ),
        ),
      );
    }),
  );

  return await runServerDomainEffect(result.pipe(E.provideService(Db, db)));
}
// end of LLM written Code
