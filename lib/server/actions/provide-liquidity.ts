'use server';

import { E, Fn } from '@/lib/shared/imports';
import type { UserLedger } from '@/domain/aggregates/ledger';
import { debitUserBalance } from '@/domain/workflows/ledger';
import {
  provideLiquidity,
  validateProvide,
  LOCK_DURATION_MS,
} from '@/domain/workflows/liquidity';
import { Cent, Units } from '@/domain/values/currencies';
import { Db, db } from '../db';
import { assetReadRepo } from '../ports/asset';
import { type } from 'arktype';
import { ledgerReadRepo, ledgerWriteRepo } from '../ports/ledger';
import { userReadRepo } from '../ports/user';
import { marketReadRepo } from '../ports/exchange';
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

  const usdAsset = assetReadRepo.getAsset({ ticker: 'USD' });

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
      // Compute the price split
      const reserveBase = BigInt(market.ammPool.reserveBase);
      const reserveQuote = BigInt(market.ammPool.reserveQuote);
      const isEmptyPool = reserveBase === 0n && reserveQuote === 0n;

      const price = isEmptyPool ? BigInt(market.modelPrice) : reserveQuote / reserveBase;
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
        E.map(() =>
          provideLiquidity({
            market,
            amountBase: Units(baseAmount),
            amountQuote: Cent.new(quoteAmount),
            currentTimestamp: new Date(),
          }),
        ),
        // Persist
        E.flatMap((lpResult) =>
          Fn.pipe(
            liquidityPositionWriteRepo.createPosition({
              marketId: market.id,
              userId: user.id,
              lpTokens: lpResult.lpTokensMinted,
              depositBase: baseAmount,
              depositQuote: quoteAmount,
              lockedUntil: lpResult.lockedUntil,
            }),
            E.flatMap(() => {
              const newStatus = lpResult.shouldActivateMarket ? ('active' as const) : market.status;
              return liquidityMarketWriteRepo.updateMarketLiquidity({
                marketId: market.id,
                ammReserveBase: lpResult.newReserveBase,
                ammReserveQuote: lpResult.newReserveQuote,
                totalLpTokens: lpResult.newTotalLpTokens,
                status: newStatus,
                // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
                ...(lpResult.shouldActivateMarket && { wasPreviouslyActive: true }),
                // end of LLM written Code
              });
            }),
            E.flatMap(() => {
              if (lpResult.shouldActivateMarket) {
                const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
                return liquidityMarketWriteRepo.activatePendingPositions(market.id, lockedUntil);
              }
              return E.void;
            }),
            E.map(() => lpResult),
          ),
        ),
      );
    }),
  );

  return await result.pipe(E.provideService(Db, db), E.runPromise);
}
