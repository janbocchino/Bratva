import { A, Fn, S } from '@/lib/shared/imports';
import * as OrderEffect from 'effect/Order';
import { Order } from '../aggregates/exchange';
import type { OrderBook, Side } from '../aggregates/exchange';

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
