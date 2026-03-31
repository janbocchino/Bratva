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
import { mapTransactionsToUsdPriceSeriesPoints } from '@/domain/workflows/price-series';
import { Cent, Units } from '@/domain/values/currencies';
import { type } from 'arktype';
import {
  applyAmmFillToPool,
  parseOptionalExpiresAt,
  parseOptionalStopLoss,
} from './place-order.shared';
import { Db, db } from '../db';
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
- How should optional trade inputs be persisted?
  - [x] Normalize blank `stopLoss` and `expiresAt` in the action so storage shape stays unchanged.
  - [ ] Make DB/domain fields nullable.
*/

const parsePrice = type('string.numeric.parse').pipe(Math.trunc).pipe(BigInt);
const parseQuantity = type('number.integer > 0');

export async function placeOrder(p: {
  userId: number;
  marketId: number;
  side: 'bid' | 'ask';
  price: string;
  quantity: number;
  stopLoss?: string;
  expiresAt?: string;
}): Promise<Order> {
  const price = E.try({
    try: () => Cent.new(parsePrice.assert(p.price)),
    catch: () => new Error('Invalid price'),
  });

  const quantity = E.try({
    try: () => parseQuantity.assert(p.quantity),
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
        // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
        validateOrderParams({
          market,
          price,
          quantity,
          side: p.side,
          userLedgerSummary: currentLedger.summary,
        }),
        // end of LLM written Code

        // Load order book and run matching
        E.flatMap(() => orderReadRepo.getOpenOrdersByMarketId(market.id)),
        E.flatMap((openOrders) => {
          const counterSide = p.side === 'bid' ? 'ask' : 'bid';
          const ammOrder = buildAmmOrder(market.ammPool, market, counterSide);

          return Fn.pipe(
            // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
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
              // end of LLM written Code

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
              const ammFilled =
                processedOrder.matches.find((match) => match.source === 'amm')?.matchedQuantity ?? 0;

              const orderFillUpdates: UpdateOrderFillsParams[] = [];
              const txnParams: CreateTransactionParams[] = [];
              const settlementEffects: E.Effect<void, any, Db>[] = [];

              for (const match of processedOrder.matches.filter((entry) => entry.source === 'book')) {
                if (match.matchedQuantity <= 0) continue;

                const before = match.before;
                const totalFilled = before.filled + match.matchedQuantity;
                const newStatus: OrderStatus =
                  totalFilled >= before.quantity
                    ? 'filled'
                    : totalFilled > 0
                      ? 'open'
                      : before.status;

                orderFillUpdates.push({
                  orderId: before.id,
                  filled: totalFilled,
                  status: newStatus,
                });

                txnParams.push({
                  marketId: market.id,
                  makerOrderId: before.id,
                  takerOrderId: createdOrder.id,
                  makerUserId: before.userId,
                  takerUserId: user.id,
                  price: Cent.new(BigInt(before.price)),
                  quantity: match.matchedQuantity,
                  side: p.side,
                  source: 'book',
                });

                // Credit maker with proceeds
                const makerCreditAssetId =
                  p.side === 'bid' ? market.quoteAssetId : market.baseAssetId;
                const makerCreditAmount =
                  p.side === 'bid'
                    ? Cent.new(BigInt(before.price) * BigInt(match.matchedQuantity))
                    : Units(BigInt(match.matchedQuantity));
                const makerCreditUnits = p.side === 'bid' ? ('cent' as const) : ('unit' as const);

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

              // AMM fill transaction + settlement
              if (ammFilled > 0) {
                txnParams.push({
                  marketId: market.id,
                  makerOrderId: null,
                  takerOrderId: createdOrder.id,
                  makerUserId: null,
                  takerUserId: user.id,
                  price: Cent.new(BigInt(ammOrder.price)),
                  quantity: ammFilled,
                  side: p.side,
                  source: 'amm',
                });
              }

              // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
              if (settledIncomingOrder.filled > 0) {
                const isBid = p.side === 'bid';
                const takerDebitAssetId = isBid ? market.quoteAssetId : market.baseAssetId;

                let takerDebitTotal = 0n;
                for (const txn of txnParams) {
                  takerDebitTotal += isBid
                    ? BigInt(txn.price) * BigInt(txn.quantity)
                    : BigInt(txn.quantity);
                }

                const assetSummary = currentLedger.summary.find(
                  (s) => s.assetId === takerDebitAssetId,
                );
                const currentBalance = assetSummary ? assetSummary.balance : (0n as Cent);

                settlementEffects.push(
                  Fn.pipe(
                    debitUserBalance({
                      userId: user.id,
                      assetId: takerDebitAssetId,
                      amount: isBid ? Cent.new(takerDebitTotal) : Units(takerDebitTotal),
                      units: isBid ? ('cent' as const) : ('unit' as const),
                      currentBalance,
                    }),
                    E.flatMap(ledgerWriteRepo.createEntry),
                  ),
                );
              }
              // end of LLM written Code

              // Update order status for incoming order
              const incomingStatus: OrderStatus =
                settledIncomingOrder.filled >= quantity ? 'filled' : 'open';

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
                  ammFilled > 0
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

  return await pipeline.pipe(E.provideService(Db, db), E.runPromise);
}
// end of LLM written Code
