import { A, E, Fn, S } from '@/lib/shared/imports';
import * as OrderEffect from 'effect/Order';
import { Order, AmmPool } from '../aggregates/exchange';
import type { Market, OrderBook, Side } from '../aggregates/exchange';
import { Cent } from '../values/currencies';
import { OrderPublicId, MarketSequenceNumber } from '../values/exchange';
import { MarketNotActiveError, OrderValidationError } from '../errors';

const priceOrder = (kind: Side) =>
  kind === 'bid' ? OrderEffect.reverse(OrderEffect.bigint) : OrderEffect.bigint;

const orderOrdered = (kind: Side) =>
  OrderEffect.struct({
    price: priceOrder(kind),
    createdAt: OrderEffect.Date,
    quantity: OrderEffect.reverse(OrderEffect.number),
  });

/* 
Testing strategy:
  1. Use Jest
*/
export function processOrder(o: {
  order: Order;
  orderBook: OrderBook;
  ammOrder: Order;
}): OrderBook {
  /* Assumptions:
    1. User has the privilege to call this function.
    2. Market has liquidity.
    3. Sequence fits market sequence.
  */
  const { order, orderBook, ammOrder } = o;

  const counterOrderKind = order.kind === 'bid' ? 'ask' : 'bid';

  // Find all orders that match
  const orderSubset = Fn.pipe(
    orderBook, // Here we begin by processing the orderbook which is defined on line 11
    S.get(counterOrderKind), // This step simply gets whatever the counterOrder is. From here, all processing is mostly identical
    A.append(ammOrder),
    // 1. Make sure the counterParty is within the budget of the order
    A.filter((o) => o.quantity !== o.filled),
    A.filter((o) => (counterOrderKind === 'ask' ? o.price <= order.price : o.price >= order.price)),
    A.sort(orderOrdered(counterOrderKind)),
  );

  if (orderSubset.length === 0) {
    // No matching order: write the incoming order to the correct side of the book and return the new book
    return {
      ...orderBook,
      [order.kind]: [...orderBook[order.kind], order],
    };
  }

  const [newCounterOrderArray, orderBeingProcessed] = Fn.pipe(
    orderSubset,
    A.reduce<[Order[], Order], Order>([[], order], (acc, currentOrder) => {
      const [orderBeingProcessedInTheMainFn, orderBeingProcessedInTheLoop] = acc;
      const oA = orderBeingProcessedInTheMainFn;
      const oB = orderBeingProcessedInTheLoop;

      // If this is the first, matched order, just return it as a array
      if (!oA) {
        return [[currentOrder], oB];
      }
      // Or else, keep adding (oA may be empty on first iteration)
      const fulfilledSoFar =
        oA.length === 0 ? 0 : oA.map((o) => o.quantity - o.filled).reduce((a, b) => a + b);
      const remaining = order.quantity - fulfilledSoFar;

      const currentOrderSatisfies = Math.min(
        currentOrder.quantity - currentOrder.filled,
        remaining,
      );
      currentOrder.filled = currentOrder.quantity - currentOrder.filled - currentOrderSatisfies;
      oB.filled = oB.filled + currentOrderSatisfies;

      return [[...oA, currentOrder], oB];
    }),
  );

  const newCounterOrderBook = Fn.pipe(
    orderBook,
    S.get(counterOrderKind),
    A.map((o) => {
      const replaceIds = newCounterOrderArray.map((o) => o.id);
      return newCounterOrderArray.find((r) => r.id === o.id) ?? o;
    }),
  );

  return {
    [counterOrderKind]: newCounterOrderBook,
    [order.kind]: [...orderBook[order.kind], order],
  } as OrderBook;
}

// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
export function buildAmmOrder(pool: AmmPool, market: Market, counterSide: Side): Order {
  const hasLiquidity = AmmPool.k(pool) > 0n && pool.reserveBase > 1n && pool.reserveQuote > 1n;

  const quantity = !hasLiquidity
    ? 0
    : counterSide === 'ask'
      ? Number(pool.reserveBase - 1n)
      : Number(AmmPool.k(pool) - pool.reserveBase);

  return {
    id: 0 as any,
    publicId: OrderPublicId('__amm__'),
    marketId: market.id,
    userId: 0 as any,
    kind: counterSide,
    price: hasLiquidity
      ? Cent.new(pool.reserveQuote / pool.reserveBase)
      : Cent.new(counterSide === 'ask' ? BigInt(Number.MAX_SAFE_INTEGER) : 0n),
    quantity,
    filled: 0,
    stopLoss: Cent.new(0n),
    marketSequenceNumber: MarketSequenceNumber(0),
    nonce: 0 as any,
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
  price: Cent;
  quantity: number;
  side: Side;
}): E.Effect<void, MarketNotActiveError | OrderValidationError> {
  if (p.market.status !== 'active')
    return E.fail(new MarketNotActiveError({ marketId: p.market.id }));
  if (p.price <= 0n)
    return E.fail(new OrderValidationError({ cause: 'Price must be > 0' }));
  if (p.quantity <= 0)
    return E.fail(new OrderValidationError({ cause: 'Quantity must be > 0' }));
  return E.void;
}
// end of LLM written Code
