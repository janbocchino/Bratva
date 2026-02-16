// import { E } from '@/lib/shared/imports';
// import type { MarketState, Order, Side, OrderBook } from '../aggregates/exchange';
// import { AmmPool } from '../aggregates/exchange';
// import { InvalidOrderError, OrderNotFoundError } from '../errors';
// import type { UserId } from '../values/user';
// import type { LedgerUnits } from '../ports/ledger';
// import { Cent, Units } from '../values/currencies';
// import type { AssetId } from '../values/asset';
// import { MarketSequenceNumber } from '../values/exchange';

// // Helper

// function sortAsks(asks: readonly Order[]): Order[] {
//   return asks
//     .filter((o) => o.side === 'ask')
//     .sort((a, b) => {
//       if (a.price < b.price) return -1;
//       if (a.price > b.price) return 1;
//       return a.createdAt.getTime() - b.createdAt.getTime();
//     });
// }

// function sortBids(bids: readonly Order[]): Order[] {
//   return bids
//     .filter((o) => o.side === 'bid')
//     .sort((a, b) => {
//       if (a.price > b.price) return -1;
//       if (a.price < b.price) return 1;
//       return a.createdAt.getTime() - b.createdAt.getTime();
//     });
// }

// type BookMatchResult = {
//   remainingQty: number;
//   updatedOpposite: Order[];
// };

// function matchingEngine(side: Side, order: Order, sortedOpposite: Order[]): BookMatchResult {
//   let remainingQty = order.quantity;
//   const updatedOpposite: Order[] = [];

//   for (const resting of sortedOpposite) {
//     if (remainingQty <= 0) {
//       updatedOpposite.push(resting);
//       continue;
//     }

//     const crosses = side === 'bid' ? order.price >= resting.price : order.price <= resting.price;

//     if (!crosses) {
//       updatedOpposite.push(...sortedOpposite.slice(updatedOpposite.length));
//       break;
//     }

//     const fillQty = remainingQty < resting.quantity ? remainingQty : resting.quantity;
//     remainingQty -= fillQty;

//     if (resting.quantity > fillQty) {
//       updatedOpposite.push({
//         ...resting,
//         quantity: resting.quantity - fillQty,
//       });
//     }
//   }

//   return { remainingQty, updatedOpposite };
// }

// function ammSwap(pool: AmmPool, side: Side, quantity: number): { pool: AmmPool; filled: number } {
//   if (quantity <= 0) return { pool, filled: 0 };

//   const k = AmmPool.k(pool);

//   if (k === 0n) return { pool, filled: 0 };

//   // buy
//   if (side === 'bid') {
//     const maxOut = pool.reserveBase - 1n; // don't want zero division issue
//     const filled = BigInt(quantity) > maxOut ? maxOut : BigInt(quantity);
//     if (filled <= 0n) return { pool, filled: 0 };

//     const newRBase = pool.reserveBase - filled;
//     const newRQuote = (k + newRBase - 1n) / newRBase;

//     return {
//       pool: { reserveBase: Units(newRBase), reserveQuote: Cent.new(newRQuote) },
//       filled: Number(filled),
//     };
//   }

//   // sell
//   const newRBase = pool.reserveBase + BigInt(quantity);
//   const newRQuote = k / newRBase;
//   const quoteOut = pool.reserveQuote - newRQuote;
//   if (quoteOut <= 0n) return { pool, filled: 0 };

//   return {
//     pool: { reserveBase: Units(newRBase), reserveQuote: Cent.new(newRQuote) },
//     filled: quantity,
//   };
// }

// // Workflow

// export function processOrder(p: {
//   order: Order;
//   marketState: MarketState;
//   side: Side;
//   userId: UserId;
//   assetId: AssetId;
//   amount: Cent | Units;
//   units: LedgerUnits;
// }): E.Effect<MarketState, InvalidOrderError> {
//   if (p.amount <= 0n) {
//     return E.fail(new InvalidOrderError({ cause: 'Amount must be > 0' }));
//   }

//   if (p.order.marketSequenceNumber !== p.marketState.marketSequenceNumber) {
//     return E.fail(new InvalidOrderError({ cause: 'Stale sequence number' }));
//   }

//   const { order, marketState, side } = p;
//   const { orderBook, ammPool } = marketState;

//   const sortedOpposite = side === 'bid' ? sortAsks(orderBook.asks) : sortBids(orderBook.bids);

//   const { remainingQty, updatedOpposite } = matchingEngine(side, order, sortedOpposite);

//   const amm =
//     order.stopLoss !== 0 && order.stopLoss !== 0n
//       ? ammSwap(ammPool, side, remainingQty)
//       : { pool: ammPool, filled: 0 };

//   const finalRemainingQty = remainingQty - amm.filled;

//   const sameBook = side === 'bid' ? orderBook.bids : orderBook.asks;
//   const restingOrder: Order[] =
//     finalRemainingQty > 0 ? [{ ...order, quantity: finalRemainingQty }] : [];

//   const newOrderBook: OrderBook =
//     side === 'bid'
//       ? { bids: [...sameBook, ...restingOrder], asks: updatedOpposite }
//       : { bids: updatedOpposite, asks: [...sameBook, ...restingOrder] };

//   return E.succeed({
//     marketSequenceNumber: MarketSequenceNumber((marketState.marketSequenceNumber as number) + 1),
//     baseAssetId: marketState.baseAssetId,
//     quoteAssetId: marketState.quoteAssetId,
//     orderBook: newOrderBook,
//     ammPool: amm.pool,
//   } satisfies MarketState);
// }

// export function cancelOrder(
//   order: Order,
//   marketState: MarketState,
// ): E.Effect<MarketState, OrderNotFoundError> {
//   const { orderBook } = marketState;
//   const inBids = orderBook.bids.some((o) => o.id === order.id);
//   const inAsks = orderBook.asks.some((o) => o.id === order.id);
//   if (!inBids && !inAsks) {
//     return E.fail(new OrderNotFoundError({ cause: 'Order not found on book' }));
//   }
//   const bids = orderBook.bids.filter((o) => o.id !== order.id);
//   const asks = orderBook.asks.filter((o) => o.id !== order.id);
//   return E.succeed({
//     ...marketState,
//     orderBook: { bids, asks },
//   });
// }
