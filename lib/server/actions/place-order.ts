// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
'use server';

import { E, Fn } from '@/lib/shared/imports';
import { AmmPool } from '@/domain/aggregates/market';
import type { Order, OrderStatus } from '@/domain/aggregates/exchange';
import type { UserLedger } from '@/domain/aggregates/ledger';
import { debitUserBalance, creditUserBalance } from '@/domain/workflows/ledger';
import {
  processOrderDetailed,
  validateOrderParams,
  buildAmmOrder,
  filterNonceEligible,
} from '@/domain/workflows/exchange';
import { settleTradeMatch } from '@/domain/workflows/trade-settlement';
import { mapTransactionsToUsdPriceSeriesPoints } from '@/domain/workflows/price-series';
import { TokenAmount, QuoteAmount } from '@/domain/values/currencies';
import { PROTOCOL_USER_ID } from '@/domain/values/protocol';
import { parseFixedPoint } from '@/domain/values/parse-fixed-point';
import { type } from 'arktype';
import {
  applyAmmFillToPool,
  parseOptionalExpiresAt,
  parseOptionalStopLoss,
} from './place-order.shared';
import { Db, db } from '../db';
import { runServerDomainEffect } from '../run-server-domain-effect';
import { assetReadRepo } from '../ports/asset';
import { ledgerReadRepo, ledgerWriteRepo } from '../ports/ledger';
import { userReadRepo, userWriteRepo } from '../ports/user';
import { marketReadRepo, marketWriteRepo } from '../ports/market';
import { orderReadRepo, orderWriteRepo, transactionWriteRepo } from '../ports/exchange';
import { priceSeriesWriteRepo } from '../ports/price-series';
import type { CreateTransactionParams, UpdateOrderFillsParams } from '@/domain/ports/exchange';

/*
Decision questionnaire
- How should settlement learn about matches?
  - [x] Consume explicit match summaries from the matcher and persist cumulative fills.
  - [ ] Diff mutated order books after the fact.
- How should trade settlement rounding work?
  - [x] Use settleTradeMatch from domain workflow. Buyer pays mulDivUp (ceiling),
        seller receives mulDivDown (floor). Dust goes to protocol user.
  - [ ] Inline rounding logic in the action (leaks domain logic into orchestration).
*/

export async function placeOrder(p: {
  userId: number;
  marketId: number;
  side: 'bid' | 'ask';
  price: string;
  quantity: string;
  stopLoss?: string;
  expiresAt?: string;
}): Promise<Order> {
  const price = E.try({
    try: () => QuoteAmount.new(parseFixedPoint(p.price)),
    catch: () => new Error('Invalid price'),
  });

  const quantity = E.try({
    try: () => TokenAmount.new(parseFixedPoint(p.quantity)),
    catch: () => new Error('Invalid quantity'),
  });

  const stopLoss = E.try({
    try: () => parseOptionalStopLoss(p.stopLoss),
    catch: () => new Error('Invalid stopLoss'),
  });

  const expiresAt = E.try({
    try: () => parseOptionalExpiresAt(p.expiresAt),
    catch: () => new Error('Invalid expiresAt'),
  });

  const market = marketReadRepo.getMarket({ id: p.marketId });

  const user = Fn.pipe(
    E.succeed(p.userId),
    E.flatMap((id) => userReadRepo.getUser({ id })),
  );

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

  const usdAsset = assetReadRepo.getAsset({ ticker: 'usd' });

  const pipeline = Fn.pipe(
    E.all({ price, quantity, stopLoss, expiresAt, market, user, currentLedger, usdAsset }),
    E.flatMap((ctx) => {
      const { price, quantity, stopLoss, expiresAt, market, user, currentLedger, usdAsset } = ctx;

      return Fn.pipe(
        validateOrderParams({
          market,
          price,
          quantity,
          side: p.side,
          userLedgerSummary: currentLedger.summary,
        }),

        E.flatMap(() => orderReadRepo.getOpenOrdersByMarketId(market.id)),
        E.flatMap((openOrders) => {
          const counterSide = p.side === 'bid' ? 'ask' : 'bid';
          const ammOrder = buildAmmOrder(market.ammPool, market, counterSide);

          return Fn.pipe(
            orderWriteRepo.createOrder({
              marketId: market.id,
              userId: user.id,
              side: p.side,
              price,
              quantity,
              stopLoss,
              marketSequenceNumber: market.sequenceNumber,
              nonce: user.nonce,
              expiresAt,
            }),
            E.tap(() => userWriteRepo.incrementNonce(user.id)),
            E.flatMap((createdOrder) => {
              const incomingNonceBlocked = openOrders.some(
                (o) => o.userId === user.id && o.nonce < user.nonce,
              );
              if (incomingNonceBlocked) {
                return E.succeed(createdOrder);
              }

              const eligibleOrders = filterNonceEligible(openOrders);
              const orderBook = {
                bid: eligibleOrders.filter((o) => o.kind === 'bid'),
                ask: eligibleOrders.filter((o) => o.kind === 'ask'),
              };

              const incomingDomainOrder: Order = {
                ...createdOrder,
                kind: p.side,
              };

              const snapshotBook = {
                bid: orderBook.bid.map((o) => ({ ...o })),
                ask: orderBook.ask.map((o) => ({ ...o })),
              };

              const processedOrder = processOrderDetailed({
                order: incomingDomainOrder,
                orderBook: snapshotBook,
                ammOrder,
              });
              const settledIncomingOrder = processedOrder.taker;
              const ammFilled = processedOrder.matches
                .filter((m) => m.source === 'amm')
                .reduce((sum, m) => sum + BigInt(m.matchedQuantity), 0n);

              const orderFillUpdates: UpdateOrderFillsParams[] = [];
              const txnParams: CreateTransactionParams[] = [];
              const settlementEffects: E.Effect<void, any, Db>[] = [];
              let totalDust = 0n;

              for (const match of processedOrder.matches.filter((entry) => entry.source === 'book')) {
                if (BigInt(match.matchedQuantity) <= 0n) continue;

                const before = match.before;
                const totalFilled = BigInt(before.filled) + BigInt(match.matchedQuantity);
                const newStatus: OrderStatus =
                  totalFilled >= BigInt(before.quantity)
                    ? 'filled'
                    : totalFilled > 0n
                      ? 'open'
                      : before.status;

                orderFillUpdates.push({
                  orderId: before.id,
                  filled: TokenAmount.new(totalFilled),
                  status: newStatus,
                });

                txnParams.push({
                  marketId: market.id,
                  makerOrderId: before.id,
                  takerOrderId: createdOrder.id,
                  makerUserId: before.userId,
                  takerUserId: user.id,
                  price: QuoteAmount.new(BigInt(before.price)),
                  quantity: match.matchedQuantity,
                  side: p.side,
                  source: 'book',
                });

                const settlement = settleTradeMatch({
                  price: QuoteAmount.new(BigInt(before.price)),
                  quantity: match.matchedQuantity,
                });

                totalDust += settlement.cost.dust;

                const makerCreditAssetId =
                  p.side === 'bid' ? market.quoteAssetId : market.baseAssetId;
                const makerCreditAmount =
                  p.side === 'bid' ? settlement.proceeds.amount : match.matchedQuantity;
                const makerCreditUnits = p.side === 'bid' ? ('scaled_unit' as const) : ('scaled_unit' as const);

                settlementEffects.push(
                  Fn.pipe(
                    creditUserBalance({
                      userId: before.userId,
                      assetId: makerCreditAssetId,
                      amount: makerCreditAmount,
                      units: makerCreditUnits,
                    }),
                    E.flatMap(ledgerWriteRepo.createEntry),
                  ),
                );
              }

              if (ammFilled > 0n) {
                txnParams.push({
                  marketId: market.id,
                  makerOrderId: null,
                  takerOrderId: createdOrder.id,
                  makerUserId: null,
                  takerUserId: user.id,
                  price: QuoteAmount.new(BigInt(ammOrder.price)),
                  quantity: TokenAmount.new(ammFilled),
                  side: p.side,
                  source: 'amm',
                });

                const ammSettlement = settleTradeMatch({
                  price: QuoteAmount.new(BigInt(ammOrder.price)),
                  quantity: TokenAmount.new(ammFilled),
                });
                totalDust += ammSettlement.cost.dust;
              }

              if (BigInt(settledIncomingOrder.filled) > 0n) {
                const isBid = p.side === 'bid';
                const takerDebitAssetId = isBid ? market.quoteAssetId : market.baseAssetId;

                let takerDebitTotal = 0n;
                for (const txn of txnParams) {
                  const matchSettlement = settleTradeMatch({
                    price: txn.price,
                    quantity: txn.quantity,
                  });
                  takerDebitTotal += isBid
                    ? BigInt(matchSettlement.cost.amount)
                    : BigInt(txn.quantity);
                }

                const assetSummary = currentLedger.summary.find(
                  (s) => s.assetId === takerDebitAssetId,
                );
                const currentBalance = assetSummary ? assetSummary.balance : QuoteAmount.zero;

                settlementEffects.push(
                  Fn.pipe(
                    debitUserBalance({
                      userId: user.id,
                      assetId: takerDebitAssetId,
                      amount: isBid ? QuoteAmount.new(takerDebitTotal) : TokenAmount.new(takerDebitTotal),
                      units: 'scaled_unit',
                      currentBalance,
                    }),
                    E.flatMap(ledgerWriteRepo.createEntry),
                  ),
                );
              }

              if (totalDust > 0n) {
                settlementEffects.push(
                  Fn.pipe(
                    creditUserBalance({
                      userId: PROTOCOL_USER_ID,
                      assetId: market.quoteAssetId,
                      amount: QuoteAmount.new(totalDust),
                      units: 'scaled_unit',
                    }),
                    E.flatMap(ledgerWriteRepo.createEntry),
                  ),
                );
              }

              const incomingStatus: OrderStatus =
                BigInt(settledIncomingOrder.filled) >= BigInt(quantity) ? 'filled' : 'open';

              const incomingFillUpdate: UpdateOrderFillsParams = {
                orderId: createdOrder.id,
                filled: settledIncomingOrder.filled,
                status: incomingStatus,
              };
              const executedAt = new Date();
              const tradePriceSeriesRows = mapTransactionsToUsdPriceSeriesPoints({
                market,
                usdAssetId: usdAsset.id,
                transactions: txnParams,
                executedAt,
              });
              const persistTransactionsAndPriceSeries =
                txnParams.length > 0
                  ? Fn.pipe(
                      transactionWriteRepo.createTransactions(txnParams),
                      E.flatMap(() =>
                        tradePriceSeriesRows.length > 0
                          ? Fn.pipe(
                              priceSeriesWriteRepo.insertPriceSeriesBatch(tradePriceSeriesRows),
                              E.asVoid,
                            )
                          : E.void,
                      ),
                    )
                  : E.void;

              return Fn.pipe(
                E.all([
                  orderWriteRepo.updateOrderFills([incomingFillUpdate, ...orderFillUpdates]),
                  persistTransactionsAndPriceSeries,
                  E.all(settlementEffects),
                  ammFilled > 0n
                    ? (() => {
                        const nextPool = applyAmmFillToPool({
                          side: p.side,
                          pool: {
                            reserveBase: BigInt(market.ammPool.reserveBase),
                            reserveQuote: BigInt(market.ammPool.reserveQuote),
                          },
                          quantity: ammFilled,
                        });
                        return marketWriteRepo.updateMarketAfterMatch({
                          marketId: market.id,
                          sequenceNumber: market.sequenceNumber + 1,
                          ammReserveBase: nextPool.reserveBase,
                          ammReserveQuote: nextPool.reserveQuote,
                        });
                      })()
                    : E.void,
                ]),
                E.map(
                  () =>
                    ({
                      ...createdOrder,
                      filled: settledIncomingOrder.filled,
                      status: incomingStatus,
                    }) satisfies Order,
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
