// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
/*
Decision questionnaire
- Where should match settlement metadata come from?
  - [x] Return explicit match summaries from the matching workflow so orchestration does not diff mutated books.
  - [ ] Infer fills later from persisted order-book state.
*/

import { A, E, Fn, S } from '@/lib/shared/imports';
import * as OrderEffect from 'effect/Order';
import { Order } from '../aggregates/exchange';
import type { OrderBook, Side } from '../aggregates/exchange';
import { AmmPool } from '../aggregates/market';
import type { Market } from '../aggregates/market';
import type { UserLedger } from '../aggregates/ledger';
import { TokenAmount, QuoteAmount, SCALE } from '../values/currencies';
import { OrderId, OrderPublicId, MarketSequenceNumber } from '../values/exchange';
import { Nonce, UserId } from '../values/user';
import { MarketNotActiveError, OrderValidationError } from '../errors';
import { BigInt as BigIntEffect } from 'effect';
import { divDown, mulDivDown } from '../values/fixed-point';

const priceOrder = (kind: Side) =>
  kind === 'bid' ? OrderEffect.reverse(OrderEffect.bigint) : OrderEffect.bigint;

const orderOrdered = (kind: Side) =>
  OrderEffect.struct({
    price: priceOrder(kind),
    createdAt: OrderEffect.Date,
    quantity: OrderEffect.reverse(OrderEffect.bigint),
  });

export type ProcessOrderMatch = {
  before: Order;
  after: Order;
  matchedQuantity: TokenAmount;
  source: 'book' | 'amm';
};

export type ProcessOrderDetailedResult = {
  orderBook: OrderBook;
  taker: Order;
  matches: readonly ProcessOrderMatch[];
};

export function processOrderDetailed(o: {
  order: Order;
  orderBook: OrderBook;
  ammOrder: Order;
}): ProcessOrderDetailedResult {
  const { order, orderBook, ammOrder } = o;

  const counterOrderKind = order.kind === 'bid' ? 'ask' : 'bid';

  const orderSubset = Fn.pipe(
    orderBook,
    S.get(counterOrderKind),
    A.append(ammOrder),
    A.filter((o) => o.quantity !== o.filled),
    A.filter((o) => (counterOrderKind === 'ask' ? o.price <= order.price : o.price >= order.price)),
    A.sort(orderOrdered(counterOrderKind)),
  );

  if (orderSubset.length === 0) {
    const nextOrderBook = {
      ...orderBook,
      [order.kind]: [...orderBook[order.kind], order],
    };
    return {
      orderBook: nextOrderBook,
      taker: order,
      matches: [],
    };
  }

  const [newCounterOrderArray, orderBeingProcessed, matches] = Fn.pipe(
    orderSubset,
    A.reduce<[Order[], Order, ProcessOrderMatch[]], Order>(
      [[], { ...order }, []],
      (acc, currentOrder) => {
        const [oA, oB, priorMatches] = acc;

        const remaining = BigInt(order.quantity) - BigInt(oB.filled);
        if (remaining <= 0n) {
          return [
            [
              ...oA,
              {
                ...currentOrder,
                filled: TokenAmount.new(BigInt(currentOrder.quantity) - BigInt(currentOrder.filled)),
              },
            ],
            oB,
            priorMatches,
          ];
        }

        const currentOrderAvailable = BigInt(currentOrder.quantity) - BigInt(currentOrder.filled);
        const currentOrderSatisfies = BigIntEffect.min(currentOrderAvailable, remaining);

        const updatedCounterOrder: Order = {
          ...currentOrder,
          filled: TokenAmount.new(BigInt(currentOrder.quantity) - currentOrderAvailable + currentOrderSatisfies),
        };

        const updatedIncoming: Order = {
          ...oB,
          filled: TokenAmount.new(BigInt(oB.filled) + currentOrderSatisfies),
        };
        const match: ProcessOrderMatch = {
          before: currentOrder,
          after: updatedCounterOrder,
          matchedQuantity: TokenAmount.new(currentOrderSatisfies),
          source: currentOrder.publicId === ammOrder.publicId ? 'amm' : 'book',
        };

        return [[...oA, updatedCounterOrder], updatedIncoming, [...priorMatches, match]];
      },
    ),
  );

  const newCounterOrderBook = Fn.pipe(
    orderBook,
    S.get(counterOrderKind),
    A.map((o) => newCounterOrderArray.find((r) => r.id === o.id) ?? o),
  );

  return {
    orderBook: {
      [counterOrderKind]: newCounterOrderBook,
      [order.kind]: [...orderBook[order.kind], orderBeingProcessed],
    } as OrderBook,
    taker: orderBeingProcessed,
    matches,
  };
}

export function processOrder(o: {
  order: Order;
  orderBook: OrderBook;
  ammOrder: Order;
}): OrderBook {
  return processOrderDetailed(o).orderBook;
}

export function buildAmmOrder(pool: AmmPool, market: Market, counterSide: Side): Order {
  const hasLiquidity = AmmPool.k(pool) > 0n && pool.reserveBase > 1n && pool.reserveQuote > 1n;

  const quantity = !hasLiquidity
    ? TokenAmount.zero
    : counterSide === 'ask'
      ? TokenAmount.new(BigInt(pool.reserveBase) - 1n)
      : TokenAmount.new(BigInt(AmmPool.k(pool)) - BigInt(pool.reserveBase));

  return {
    id: OrderId(0),
    publicId: OrderPublicId('__amm__'),
    marketId: market.id,
    userId: UserId(0),
    kind: counterSide,
    price: hasLiquidity
      ? QuoteAmount.new(mulDivDown(BigInt(pool.reserveQuote), SCALE, BigInt(pool.reserveBase)))
      : QuoteAmount.new(counterSide === 'ask' ? BigInt(Number.MAX_SAFE_INTEGER) : 0n),
    quantity,
    filled: TokenAmount.zero,
    stopLoss: QuoteAmount.zero,
    marketSequenceNumber: MarketSequenceNumber(0),
    nonce: Nonce(0),
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000),
    canceled: false,
    canceledAt: new Date(0),
  };
}

export function filterNonceEligible(orders: Order[]): Order[] {
  const minNonceByUser = new Map<number, number>();
  for (const o of orders) {
    const prev = minNonceByUser.get(o.userId);
    if (prev === undefined || o.nonce < prev) minNonceByUser.set(o.userId, o.nonce);
  }
  return orders.filter((o) => o.nonce === minNonceByUser.get(o.userId));
}

export function validateOrderParams(p: {
  market: Market;
  price: QuoteAmount;
  quantity: TokenAmount;
  side: Side;
  userLedgerSummary?: UserLedger['summary'];
}): E.Effect<void, MarketNotActiveError | OrderValidationError> {
  if (p.market.status === 'pending' && p.market.wasPreviouslyActive) {
    const tokenBalance =
      p.userLedgerSummary?.find((s) => s.assetId === p.market.baseAssetId)?.balance ?? 0n;
    if (tokenBalance <= 0n) return E.fail(new MarketNotActiveError({ marketId: p.market.id }));
  } else if (p.market.status !== 'active') {
    return E.fail(new MarketNotActiveError({ marketId: p.market.id }));
  }
  if (p.price <= 0n) return E.fail(new OrderValidationError({ cause: 'Price must be > 0' }));
  if (p.quantity <= 0n) return E.fail(new OrderValidationError({ cause: 'Quantity must be > 0' }));
  return E.void;
}
// end of LLM written Code
