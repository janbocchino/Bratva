/// <reference types="jest" />
import { processOrder } from '../workflows/exchange';
import { OrderId } from '../values/exchange';
import { Cent } from '../values/currencies';
import type { Order, OrderBook } from '../aggregates/exchange';

const now = new Date();

const mkOrder = (
  overrides: Partial<Order> & Pick<Order, 'id' | 'kind' | 'price' | 'quantity'>,
): Order => ({
  filled: 0,
  createdAt: now,
  canceled: false,
  canceledAt: now,
  ...overrides,
});

const emptyBook: OrderBook = { bid: [], ask: [] };

describe('processOrder', () => {
  /* ------------------------------------------------------------------ */
  /*  Group 1 — No-match cases (order rests on the book)                */
  /* ------------------------------------------------------------------ */
  describe('no-match cases', () => {
    it('1a: bid on empty book with ammOrder ask price too high', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 5 });

      const result = processOrder({ order: bid, orderBook: emptyBook, ammOrder });

      expect(result.bid).toHaveLength(1);
      expect(result.bid[0]).toBe(bid);
      expect(result.bid[0].filled).toBe(0);
      expect(result.ask).toHaveLength(0);
    });

    it('1b: ask on empty book with ammOrder bid price too low', () => {
      const ask = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'bid', price: Cent.new(50n), quantity: 5 });

      const result = processOrder({ order: ask, orderBook: emptyBook, ammOrder });

      expect(result.ask).toHaveLength(1);
      expect(result.ask[0]).toBe(ask);
      expect(result.ask[0].filled).toBe(0);
      expect(result.bid).toHaveLength(0);
    });

    it('1c: bid when all book asks are priced above bid price', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const highAsk = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(150n), quantity: 5 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 5 });
      const orderBook: OrderBook = { bid: [], ask: [highAsk] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid).toHaveLength(1);
      expect(result.bid[0]).toBe(bid);
      expect(result.ask).toHaveLength(1);
      expect(result.ask[0]).toBe(highAsk);
      expect(result.ask[0].filled).toBe(0);
    });

    it('1d: ask when all book bids are priced below ask price', () => {
      const ask = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 10 });
      const lowBid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(50n), quantity: 5 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'bid', price: Cent.new(25n), quantity: 5 });
      const orderBook: OrderBook = { bid: [lowBid], ask: [] };

      const result = processOrder({ order: ask, orderBook, ammOrder });

      expect(result.ask).toHaveLength(1);
      expect(result.ask[0]).toBe(ask);
      expect(result.bid).toHaveLength(1);
      expect(result.bid[0]).toBe(lowBid);
      expect(result.bid[0].filled).toBe(0);
    });

    it('1e: bid when counter asks and ammOrder are fully filled', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const filledAsk = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 5, filled: 5 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(80n), quantity: 5, filled: 5 });
      const orderBook: OrderBook = { bid: [], ask: [filledAsk] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid).toHaveLength(1);
      expect(result.bid[0]).toBe(bid);
      expect(result.bid[0].filled).toBe(0);
      expect(result.ask).toHaveLength(1);
      expect(result.ask[0]).toBe(filledAsk);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Group 2 — Single exact match                                      */
  /* ------------------------------------------------------------------ */
  describe('single exact match', () => {
    it('2a: bid(qty=5) fully matches ask(qty=5)', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 5 });
      const ask = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 5 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid).toHaveLength(1);
      expect(result.bid[0].filled).toBe(5);
      expect(result.ask).toHaveLength(1);
      expect(result.ask[0].filled).toBe(0);
    });

    it('2b: ask(qty=5) fully matches bid(qty=5)', () => {
      const ask = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 5 });
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(120n), quantity: 5 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'bid', price: Cent.new(50n), quantity: 100 });
      const orderBook: OrderBook = { bid: [bid], ask: [] };

      const result = processOrder({ order: ask, orderBook, ammOrder });

      expect(result.ask).toHaveLength(1);
      expect(result.ask[0].filled).toBe(5);
      expect(result.bid).toHaveLength(1);
      expect(result.bid[0].filled).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Group 3 — Partial fill: incoming order larger than counter         */
  /* ------------------------------------------------------------------ */
  describe('partial fill — incoming larger than counter', () => {
    it('3a: bid(qty=10) vs ask(qty=5) — bid partially filled', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ask = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 5 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(5);
      expect(result.ask[0].filled).toBe(0);
    });

    it('3b: ask(qty=10) vs bid(qty=5) — ask partially filled', () => {
      const ask = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 10 });
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(120n), quantity: 5 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'bid', price: Cent.new(50n), quantity: 100 });
      const orderBook: OrderBook = { bid: [bid], ask: [] };

      const result = processOrder({ order: ask, orderBook, ammOrder });

      expect(result.ask[0].filled).toBe(5);
      expect(result.bid[0].filled).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Group 4 — Partial fill: incoming order smaller than counter        */
  /* ------------------------------------------------------------------ */
  describe('partial fill — incoming smaller than counter', () => {
    it('4a: bid(qty=3) vs ask(qty=10) — bid fully satisfied, ask partially consumed', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 3 });
      const ask = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 10 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(3);
      expect(result.ask[0].filled).toBe(7);
    });

    it('4b: ask(qty=3) vs bid(qty=10) — ask fully satisfied, bid partially consumed', () => {
      const ask = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 3 });
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(120n), quantity: 10 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'bid', price: Cent.new(50n), quantity: 100 });
      const orderBook: OrderBook = { bid: [bid], ask: [] };

      const result = processOrder({ order: ask, orderBook, ammOrder });

      expect(result.ask[0].filled).toBe(3);
      expect(result.bid[0].filled).toBe(7);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Group 5 — AMM order matching                                      */
  /* ------------------------------------------------------------------ */
  describe('AMM order matching', () => {
    it('5a: bid matches only the ammOrder — ammOrder absent from returned book', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(90n), quantity: 6 });

      const result = processOrder({ order: bid, orderBook: emptyBook, ammOrder });

      expect(result.bid).toHaveLength(1);
      expect(result.bid[0].filled).toBe(6);
      expect(result.ask).toHaveLength(0);
    });

    it('5b: ask matches only the ammOrder — ammOrder absent from returned book', () => {
      const ask = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'bid', price: Cent.new(110n), quantity: 6 });

      const result = processOrder({ order: ask, orderBook: emptyBook, ammOrder });

      expect(result.ask).toHaveLength(1);
      expect(result.ask[0].filled).toBe(6);
      expect(result.bid).toHaveLength(0);
    });

    it('5c: bid matches book ask + ammOrder (mixed fill)', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ask = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(70n), quantity: 3 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(90n), quantity: 5 });
      const orderBook: OrderBook = { bid: [], ask: [ask] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(8);
      expect(result.ask).toHaveLength(1);
      expect(result.ask[0].id).toBe(ask.id);
    });

    it('5d: ammOrder fully filled — excluded from candidates, no match', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(90n), quantity: 5, filled: 5 });

      const result = processOrder({ order: bid, orderBook: emptyBook, ammOrder });

      expect(result.bid).toHaveLength(1);
      expect(result.bid[0].filled).toBe(0);
      expect(result.ask).toHaveLength(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Group 6 — Multi-order cascading fill                              */
  /* ------------------------------------------------------------------ */
  describe('multi-order cascading fill', () => {
    it('6a: bid(qty=10) fully filled by ask1(qty=3) + ask2(qty=7)', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ask1 = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(70n), quantity: 3 });
      const ask2 = mkOrder({ id: OrderId('ask-2'), kind: 'ask', price: Cent.new(80n), quantity: 7 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask1, ask2] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(10);
      expect(result.ask).toHaveLength(2);
      expect(result.ask.find((o) => o.id === ask1.id)!.filled).toBe(0);
      expect(result.ask.find((o) => o.id === ask2.id)!.filled).toBe(0);
    });

    it('6b: bid(qty=15) partially filled by ask1(qty=3) + ask2(qty=7) — 5 unfilled', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 15 });
      const ask1 = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(70n), quantity: 3 });
      const ask2 = mkOrder({ id: OrderId('ask-2'), kind: 'ask', price: Cent.new(80n), quantity: 7 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask1, ask2] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(10);
      expect(result.bid[0].quantity).toBe(15);
    });

    it('6c: ask(qty=10) fully filled by bid1(qty=4) + bid2(qty=6)', () => {
      const ask = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 10 });
      const bid1 = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(120n), quantity: 4 });
      const bid2 = mkOrder({ id: OrderId('bid-2'), kind: 'bid', price: Cent.new(110n), quantity: 6 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'bid', price: Cent.new(50n), quantity: 100 });
      const orderBook: OrderBook = { bid: [bid1, bid2], ask: [] };

      const result = processOrder({ order: ask, orderBook, ammOrder });

      expect(result.ask[0].filled).toBe(10);
      expect(result.bid.find((o) => o.id === bid1.id)!.filled).toBe(0);
      expect(result.bid.find((o) => o.id === bid2.id)!.filled).toBe(0);
    });

    it('6d: three counter orders but only two needed to fill', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 8 });
      const ask1 = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(70n), quantity: 3 });
      const ask2 = mkOrder({ id: OrderId('ask-2'), kind: 'ask', price: Cent.new(80n), quantity: 5 });
      const ask3 = mkOrder({ id: OrderId('ask-3'), kind: 'ask', price: Cent.new(90n), quantity: 10 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask1, ask2, ask3] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(8);
      expect(result.ask.find((o) => o.id === ask1.id)!.filled).toBe(0);
      expect(result.ask.find((o) => o.id === ask2.id)!.filled).toBe(0);
      expect(result.ask.find((o) => o.id === ask3.id)!.filled).toBe(10);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Group 7 — Sort priority verification                              */
  /* ------------------------------------------------------------------ */
  describe('sort priority', () => {
    it('7a: asks sorted by price ascending — cheapest ask matched first', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 3 });
      const askCheap = mkOrder({ id: OrderId('ask-cheap'), kind: 'ask', price: Cent.new(80n), quantity: 10 });
      const askExpensive = mkOrder({ id: OrderId('ask-exp'), kind: 'ask', price: Cent.new(90n), quantity: 10 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [askExpensive, askCheap] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(3);
      expect(result.ask.find((o) => o.id === askCheap.id)!.filled).toBe(7);
      expect(result.ask.find((o) => o.id === askExpensive.id)!.filled).toBe(10);
    });

    it('7b: bids sorted by price descending — highest bid matched first', () => {
      const ask = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 3 });
      const bidHigh = mkOrder({ id: OrderId('bid-high'), kind: 'bid', price: Cent.new(120n), quantity: 10 });
      const bidLow = mkOrder({ id: OrderId('bid-low'), kind: 'bid', price: Cent.new(110n), quantity: 10 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'bid', price: Cent.new(50n), quantity: 100 });
      const orderBook: OrderBook = { bid: [bidLow, bidHigh], ask: [] };

      const result = processOrder({ order: ask, orderBook, ammOrder });

      expect(result.ask[0].filled).toBe(3);
      expect(result.bid.find((o) => o.id === bidHigh.id)!.filled).toBe(7);
      expect(result.bid.find((o) => o.id === bidLow.id)!.filled).toBe(10);
    });

    it('7c: same price — earlier createdAt matched first', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 3 });
      const askEarly = mkOrder({
        id: OrderId('ask-early'),
        kind: 'ask',
        price: Cent.new(80n),
        quantity: 10,
        createdAt: new Date(now.getTime()),
      });
      const askLate = mkOrder({
        id: OrderId('ask-late'),
        kind: 'ask',
        price: Cent.new(80n),
        quantity: 10,
        createdAt: new Date(now.getTime() + 1000),
      });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [askLate, askEarly] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(3);
      expect(result.ask.find((o) => o.id === askEarly.id)!.filled).toBe(7);
      expect(result.ask.find((o) => o.id === askLate.id)!.filled).toBe(10);
    });

    it('7d: same price, same time — larger quantity matched first', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 3 });
      const askLarge = mkOrder({
        id: OrderId('ask-large'),
        kind: 'ask',
        price: Cent.new(80n),
        quantity: 10,
        createdAt: now,
      });
      const askSmall = mkOrder({
        id: OrderId('ask-small'),
        kind: 'ask',
        price: Cent.new(80n),
        quantity: 5,
        createdAt: now,
      });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [askSmall, askLarge] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(3);
      expect(result.ask.find((o) => o.id === askLarge.id)!.filled).toBe(7);
      expect(result.ask.find((o) => o.id === askSmall.id)!.filled).toBe(5);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Group 8 — Partially-filled counter orders                         */
  /* ------------------------------------------------------------------ */
  describe('partially-filled counter orders', () => {
    it('8a: counter ask with prior partial fill — only remaining capacity available', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ask = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 5, filled: 2 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(3);
      expect(result.ask[0].filled).toBe(0);
    });

    it('8b: counter ask fully filled (qty === filled) — excluded from matching', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const filledAsk = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 5, filled: 5 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [filledAsk] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid).toHaveLength(1);
      expect(result.bid[0].filled).toBe(0);
      expect(result.ask).toHaveLength(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Group 9 — Order book structure integrity                          */
  /* ------------------------------------------------------------------ */
  describe('order book structure integrity', () => {
    it('9a: existing same-side orders are preserved alongside new order', () => {
      const bid1 = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(90n), quantity: 5 });
      const bid2 = mkOrder({ id: OrderId('bid-2'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [bid1], ask: [] };

      const result = processOrder({ order: bid2, orderBook, ammOrder });

      expect(result.bid).toHaveLength(2);
      expect(result.bid[0]).toBe(bid1);
      expect(result.bid[1]).toBe(bid2);
    });

    it('9b: unmatched counter orders remain unchanged in the returned book', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 3 });
      const ask1 = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 10 });
      const ask2 = mkOrder({ id: OrderId('ask-2'), kind: 'ask', price: Cent.new(150n), quantity: 5 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask1, ask2] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      const returnedAsk2 = result.ask.find((o) => o.id === ask2.id);
      expect(returnedAsk2).toBeDefined();
      expect(returnedAsk2!.filled).toBe(0);
      expect(returnedAsk2!.quantity).toBe(5);
    });

    it('9c: ammOrder never appears in the returned order book', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(90n), quantity: 6 });

      const result = processOrder({ order: bid, orderBook: emptyBook, ammOrder });

      expect(result.ask).toHaveLength(0);
      expect(result.bid.every((o) => o.id !== ammOrder.id)).toBe(true);
    });

    it('9d: returned book always has both bid and ask keys as arrays', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });

      const noMatch = processOrder({ order: bid, orderBook: emptyBook, ammOrder });
      expect(Array.isArray(noMatch.bid)).toBe(true);
      expect(Array.isArray(noMatch.ask)).toBe(true);

      const ask = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 5 });
      const withMatch = processOrder({
        order: mkOrder({ id: OrderId('bid-2'), kind: 'bid', price: Cent.new(100n), quantity: 3 }),
        orderBook: { bid: [], ask: [ask] },
        ammOrder,
      });
      expect(Array.isArray(withMatch.bid)).toBe(true);
      expect(Array.isArray(withMatch.ask)).toBe(true);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Group 10 — Edge cases                                             */
  /* ------------------------------------------------------------------ */
  describe('edge cases', () => {
    it('10a: minimum quantity (qty=1) against a large counter order', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 1 });
      const ask = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 1000 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(1);
      expect(result.ask[0].filled).toBe(999);
    });

    it('10b: price equality boundary — ask price === bid price should match', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 5 });
      const ask = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 5 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(5);
    });

    it('10c: ammOrder partially filled — only remaining capacity available', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(90n), quantity: 8, filled: 3 });

      const result = processOrder({ order: bid, orderBook: emptyBook, ammOrder });

      expect(result.bid[0].filled).toBe(5);
    });

    it('10d: all counter orders match but incoming order still not fully filled', () => {
      const bid = mkOrder({ id: OrderId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 20 });
      const ask1 = mkOrder({ id: OrderId('ask-1'), kind: 'ask', price: Cent.new(70n), quantity: 3 });
      const ask2 = mkOrder({ id: OrderId('ask-2'), kind: 'ask', price: Cent.new(80n), quantity: 5 });
      const ammOrder = mkOrder({ id: OrderId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask1, ask2] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(8);
      expect(result.bid[0].quantity).toBe(20);
      expect(result.bid).toHaveLength(1);
    });
  });
});
