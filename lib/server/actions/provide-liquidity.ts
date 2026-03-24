'use server';

import { E, Fn } from '@/lib/shared/imports';
import type { UserLedger } from '@/domain/aggregates/ledger';
import { debitUserBalance } from '@/domain/workflows/ledger';
import { provideLiquidity, validateProvide, LOCK_DURATION_MS } from '@/domain/workflows/liquidity';
import { transitionMarket } from '@/domain/workflows/market';
import { selectMarketDisplayPrice } from '@/domain/workflows/price';
import { Cent, Units } from '@/domain/values/currencies';
import { Db, db } from '../db';
import { assetReadRepo } from '../ports/asset';
import { type } from 'arktype';
import { ledgerReadRepo, ledgerWriteRepo } from '../ports/ledger';
import { userReadRepo } from '../ports/user';
import { marketReadRepo } from '../ports/market';
import { liquidityMarketWriteRepo, liquidityPositionWriteRepo } from '../ports/liquidity';

export async function provideLiquidityAction(p: {
  userId: number;
  marketPublicId: string;
  amountDollars: string;
}) {
  const cents = E.try({
    try: () =>
      type('string.numeric.parse |> number > 0')
        .pipe((n) => n * 100)
        .pipe(BigInt)
        .assert(p.amountDollars),
    catch: () => new Error('Invalid amountDollars'),
  });

  const user = Fn.pipe(
    E.succeed(p.userId),
    E.flatMap((id) => userReadRepo.getUser({ id })),
  );

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
    E.all({ cents, user, usdAsset, market, currentLedger }),
    E.flatMap(({ cents, user, usdAsset, market, currentLedger }) => {
      // beginning of LLM written Code, Model: gpt-5.3-codex
      // Compute split using status-based market display price.
      const price = BigInt(selectMarketDisplayPrice(market));
      if (price <= 0n) return E.fail(new Error('Market price must be > 0'));
      // end of LLM written Code
      const quoteAmount = cents / 2n;
      const baseAmount = quoteAmount / price;

      return Fn.pipe(
        // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
        validateProvide({
          market,
          amountBase: Units(baseAmount),
          amountQuote: Cent.new(quoteAmount),
        }),
        // end of LLM written Code
        // Debit USD
        E.flatMap(() => {
          const usdSummary = currentLedger.summary.find((s) => s.assetId === usdAsset.id);
          const balanceCents = usdSummary ? usdSummary.balance : (0n as Cent);
          return debitUserBalance({
            userId: user.id,
            assetId: usdAsset.id,
            amount: Cent.new(cents),
            units: 'cent',
            currentBalance: balanceCents,
          });
        }),
        E.flatMap(ledgerWriteRepo.createEntry),
        // Pure computation
        // beginning of LLM written Code, Model: Gemini
        E.map(() => {
          const now = new Date();
          return provideLiquidity({
            market,
            amountBase: Units(baseAmount),
            amountQuote: Cent.new(quoteAmount),
            currentTimestamp: now,
          });
        }),
        // end of LLM written Code
        // Persist
        E.flatMap((lpResult) =>
          Fn.pipe(
            transitionMarket(market, {
              // beginning of LLM written Code, Model: gpt-5.3-codex
              _tag: 'LiquidityProvided',
              result: lpResult,
              occurredAt: lpResult.lockedUntil ?? new Date(),
              // end of LLM written Code
            }),
            E.flatMap((nextMarket) =>
              Fn.pipe(
                liquidityPositionWriteRepo.createPosition({
                  marketId: market.id,
                  userId: user.id,
                  lpTokens: lpResult.lpTokensMinted,
                  depositBase: baseAmount,
                  depositQuote: quoteAmount,
                  lockedUntil: lpResult.lockedUntil,
                }),
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
                E.flatMap(() => {
                  // beginning of LLM written Code, Model: gpt-5.3-codex
                  const didActivate = market.status !== 'active' && nextMarket.status === 'active';
                  // end of LLM written Code
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

  return await result.pipe(E.provideService(Db, db), E.runPromise);
}
