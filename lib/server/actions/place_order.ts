// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
'use server';

import { E, Fn } from '@/lib/shared/imports';
import { AmmPool } from '@/domain/aggregates/exchange';
import type { Order, OrderStatus } from '@/domain/aggregates/exchange';
import type { UserLedger } from '@/domain/aggregates/ledger';
import { debitUserBalance, creditUserBalance } from '@/domain/workflows/ledger';
import {
  processOrder,
  validateOrderParams,
  buildAmmOrder,
  filterNonceEligible,
} from '@/domain/workflows/exchange';
import { Cent, Units } from '@/domain/values/currencies';
import { type } from 'arktype';
import { Db, db } from '../db';
import { ledgerReadRepo, ledgerWriteRepo } from '../ports/ledger';
import { userReadRepo, userWriteRepo } from '../ports/user';
import {
  marketReadRepo,
  marketWriteRepo,
  orderReadRepo,
  orderWriteRepo,
  transactionWriteRepo,
} from '../ports/exchange';
import type { CreateTransactionParams, UpdateOrderFillsParams } from '@/domain/ports/exchange';

const parsePrice = type('string.numeric.parse').pipe(Math.trunc).pipe(BigInt);
const parseQuantity = type('number.integer > 0');

export async function placeOrder(p: {
  userId: number;
  marketId: number;
  side: 'bid' | 'ask';
  price: string;
  quantity: number;
  stopLoss: string;
  expiresAt: string;
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
    try: () => Cent.new(parsePrice.assert(p.stopLoss)),
    catch: () => new Error('Invalid stopLoss'),
  });

  const expiresAt = E.try({
    try: () => new Date(p.expiresAt),
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

  const pipeline = Fn.pipe(
    E.all({ price, quantity, stopLoss, expiresAt, market, user, currentLedger }),
    E.flatMap((ctx) => {
      const { price, quantity, stopLoss, expiresAt, market, user, currentLedger } = ctx;

      return Fn.pipe(
        validateOrderParams({ market, price, quantity, side: p.side }),

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

              const newBook = processOrder({
                order: incomingDomainOrder,
                orderBook: snapshotBook,
                ammOrder,
              });

              const ammFilled = ammOrder.filled;

              // Determine fills on counter orders by comparing before/after
              const counterBefore = p.side === 'bid' ? orderBook.ask : orderBook.bid;
              const counterAfter = p.side === 'bid' ? newBook.ask : newBook.bid;

              const orderFillUpdates: UpdateOrderFillsParams[] = [];
              const txnParams: CreateTransactionParams[] = [];
              const settlementEffects: E.Effect<void, any, Db>[] = [];

              for (const after of counterAfter) {
                const before = counterBefore.find((b) => b.publicId === after.publicId);
                if (!before) continue;

                const filledDelta = before.filled - after.filled;
                if (filledDelta <= 0) continue;

                const newFilled = before.quantity - (after.quantity - after.filled + filledDelta);
                const totalFilled = before.filled + filledDelta;
                const newStatus: OrderStatus =
                  totalFilled >= before.quantity
                    ? 'filled'
                    : totalFilled > 0
                      ? 'open'
                      : before.status;

                orderFillUpdates.push({
                  orderId: after.id,
                  filled: after.filled,
                  status: newStatus,
                });

                txnParams.push({
                  marketId: market.id,
                  makerOrderId: after.id,
                  takerOrderId: createdOrder.id,
                  makerUserId: after.userId,
                  takerUserId: user.id,
                  price: Cent.new(BigInt(after.price)),
                  quantity: filledDelta,
                  side: p.side,
                  source: 'book',
                });

                // Credit maker with proceeds
                const makerCreditAssetId =
                  p.side === 'bid' ? market.quoteAssetId : market.baseAssetId;
                const makerCreditAmount =
                  p.side === 'bid'
                    ? Cent.new(BigInt(after.price) * BigInt(filledDelta))
                    : Units(BigInt(filledDelta));
                const makerCreditUnits = p.side === 'bid' ? ('cent' as const) : ('unit' as const);

                settlementEffects.push(
                  Fn.pipe(
                    creditUserBalance({
                      userId: after.userId,
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
              if (incomingDomainOrder.filled > 0) {
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
                incomingDomainOrder.filled >= quantity ? 'filled' : 'open';

              const incomingFillUpdate: UpdateOrderFillsParams = {
                orderId: createdOrder.id,
                filled: incomingDomainOrder.filled,
                status: incomingStatus,
              };

              return Fn.pipe(
                E.all([
                  orderWriteRepo.updateOrderFills([incomingFillUpdate, ...orderFillUpdates]),
                  txnParams.length > 0
                    ? transactionWriteRepo.createTransactions(txnParams)
                    : E.void,
                  E.all(settlementEffects),
                  ammFilled > 0
                    ? (() => {
                        const k = AmmPool.k(market.ammPool);
                        const newRB = market.ammPool.reserveBase - BigInt(ammFilled);
                        const newRQ = (k + newRB - 1n) / newRB;
                        return marketWriteRepo.updateMarketAfterMatch({
                          marketId: market.id,
                          sequenceNumber: market.sequenceNumber + 1,
                          ammReserveBase: BigInt(newRB),
                          ammReserveQuote: BigInt(newRQ),
                        });
                      })()
                    : E.void,
                ]),
                E.map(
                  () =>
                    ({
                      ...createdOrder,
                      filled: incomingDomainOrder.filled,
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
