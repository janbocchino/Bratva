// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
/// <reference types="jest" />
import { processOrder, buildAmmOrder, filterNonceEligible } from '../workflows/exchange';
import { AmmPool } from '../aggregates/exchange';
import { OrderId, OrderPublicId, MarketId, MarketPublicId, MarketSequenceNumber } from '../values/exchange';
import { Cent, Units } from '../values/currencies';
import { UserId, Nonce } from '../values/user';
import type { Order, OrderBook, Market, AmmPool as AmmPoolType } from '../aggregates/exchange';
import type { AssetId } from '../values/asset';

const now = new Date();
let counter = 0;

const mkOrder = (
  overrides: Partial<Order> & Pick<Order, 'publicId' | 'kind' | 'price' | 'quantity'>,
): Order => ({
  id: OrderId(++counter),
  marketId: MarketId(1),
  userId: UserId(1),
  filled: 0,
  stopLoss: Cent.new(0n),
  marketSequenceNumber: MarketSequenceNumber(0),
  nonce: Nonce(0),
  status: 'open',
  createdAt: now,
  updatedAt: now,
  expiresAt: new Date(now.getTime() + 86400000),
  canceled: false,
  canceledAt: now,
  ...overrides,
});

const emptyBook: OrderBook = { bid: [], ask: [] };

describe('processOrder', () => {
  beforeEach(() => { counter = 0; });

  /* ------------------------------------------------------------------ */
  /*  Group 1 — No-match cases (order rests on the book)                */
  /* ------------------------------------------------------------------ */
  describe('no-match cases', () => {
    it('1a: bid on empty book with ammOrder ask price too high', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 5 });

      const result = processOrder({ order: bid, orderBook: emptyBook, ammOrder });

      expect(result.bid).toHaveLength(1);
      expect(result.bid[0]).toBe(bid);
      expect(result.bid[0].filled).toBe(0);
      expect(result.ask).toHaveLength(0);
    });

    it('1b: ask on empty book with ammOrder bid price too low', () => {
      const ask = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'bid', price: Cent.new(50n), quantity: 5 });

      const result = processOrder({ order: ask, orderBook: emptyBook, ammOrder });

      expect(result.ask).toHaveLength(1);
      expect(result.ask[0]).toBe(ask);
      expect(result.ask[0].filled).toBe(0);
      expect(result.bid).toHaveLength(0);
    });

    it('1c: bid when all book asks are priced above bid price', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const highAsk = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(150n), quantity: 5 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 5 });
      const orderBook: OrderBook = { bid: [], ask: [highAsk] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid).toHaveLength(1);
      expect(result.bid[0]).toBe(bid);
      expect(result.ask).toHaveLength(1);
      expect(result.ask[0]).toBe(highAsk);
      expect(result.ask[0].filled).toBe(0);
    });

    it('1d: ask when all book bids are priced below ask price', () => {
      const ask = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 10 });
      const lowBid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(50n), quantity: 5 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'bid', price: Cent.new(25n), quantity: 5 });
      const orderBook: OrderBook = { bid: [lowBid], ask: [] };

      const result = processOrder({ order: ask, orderBook, ammOrder });

      expect(result.ask).toHaveLength(1);
      expect(result.ask[0]).toBe(ask);
      expect(result.bid).toHaveLength(1);
      expect(result.bid[0]).toBe(lowBid);
      expect(result.bid[0].filled).toBe(0);
    });

    it('1e: bid when counter asks and ammOrder are fully filled', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const filledAsk = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 5, filled: 5 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(80n), quantity: 5, filled: 5 });
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
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 5 });
      const ask = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 5 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid).toHaveLength(1);
      expect(result.bid[0].filled).toBe(5);
      expect(result.ask).toHaveLength(1);
      expect(result.ask[0].filled).toBe(0);
    });

    it('2b: ask(qty=5) fully matches bid(qty=5)', () => {
      const ask = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 5 });
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(120n), quantity: 5 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'bid', price: Cent.new(50n), quantity: 100 });
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
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ask = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 5 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(5);
      expect(result.ask[0].filled).toBe(0);
    });

    it('3b: ask(qty=10) vs bid(qty=5) — ask partially filled', () => {
      const ask = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 10 });
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(120n), quantity: 5 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'bid', price: Cent.new(50n), quantity: 100 });
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
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 3 });
      const ask = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 10 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(3);
      expect(result.ask[0].filled).toBe(7);
    });

    it('4b: ask(qty=3) vs bid(qty=10) — ask fully satisfied, bid partially consumed', () => {
      const ask = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 3 });
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(120n), quantity: 10 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'bid', price: Cent.new(50n), quantity: 100 });
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
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(90n), quantity: 6 });

      const result = processOrder({ order: bid, orderBook: emptyBook, ammOrder });

      expect(result.bid).toHaveLength(1);
      expect(result.bid[0].filled).toBe(6);
      expect(result.ask).toHaveLength(0);
    });

    it('5b: ask matches only the ammOrder — ammOrder absent from returned book', () => {
      const ask = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'bid', price: Cent.new(110n), quantity: 6 });

      const result = processOrder({ order: ask, orderBook: emptyBook, ammOrder });

      expect(result.ask).toHaveLength(1);
      expect(result.ask[0].filled).toBe(6);
      expect(result.bid).toHaveLength(0);
    });

    it('5c: bid matches book ask + ammOrder (mixed fill)', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ask = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(70n), quantity: 3 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(90n), quantity: 5 });
      const orderBook: OrderBook = { bid: [], ask: [ask] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(8);
      expect(result.ask).toHaveLength(1);
      expect(result.ask[0].publicId).toBe(ask.publicId);
    });

    it('5d: ammOrder fully filled — excluded from candidates, no match', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(90n), quantity: 5, filled: 5 });

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
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ask1 = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(70n), quantity: 3 });
      const ask2 = mkOrder({ publicId: OrderPublicId('ask-2'), kind: 'ask', price: Cent.new(80n), quantity: 7 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask1, ask2] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(10);
      expect(result.ask).toHaveLength(2);
      expect(result.ask.find((o) => o.publicId === ask1.publicId)!.filled).toBe(0);
      expect(result.ask.find((o) => o.publicId === ask2.publicId)!.filled).toBe(0);
    });

    it('6b: bid(qty=15) partially filled by ask1(qty=3) + ask2(qty=7) — 5 unfilled', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 15 });
      const ask1 = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(70n), quantity: 3 });
      const ask2 = mkOrder({ publicId: OrderPublicId('ask-2'), kind: 'ask', price: Cent.new(80n), quantity: 7 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask1, ask2] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(10);
      expect(result.bid[0].quantity).toBe(15);
    });

    it('6c: ask(qty=10) fully filled by bid1(qty=4) + bid2(qty=6)', () => {
      const ask = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 10 });
      const bid1 = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(120n), quantity: 4 });
      const bid2 = mkOrder({ publicId: OrderPublicId('bid-2'), kind: 'bid', price: Cent.new(110n), quantity: 6 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'bid', price: Cent.new(50n), quantity: 100 });
      const orderBook: OrderBook = { bid: [bid1, bid2], ask: [] };

      const result = processOrder({ order: ask, orderBook, ammOrder });

      expect(result.ask[0].filled).toBe(10);
      expect(result.bid.find((o) => o.publicId === bid1.publicId)!.filled).toBe(0);
      expect(result.bid.find((o) => o.publicId === bid2.publicId)!.filled).toBe(0);
    });

    it('6d: three counter orders but only two needed to fill', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 8 });
      const ask1 = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(70n), quantity: 3 });
      const ask2 = mkOrder({ publicId: OrderPublicId('ask-2'), kind: 'ask', price: Cent.new(80n), quantity: 5 });
      const ask3 = mkOrder({ publicId: OrderPublicId('ask-3'), kind: 'ask', price: Cent.new(90n), quantity: 10 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask1, ask2, ask3] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(8);
      expect(result.ask.find((o) => o.publicId === ask1.publicId)!.filled).toBe(0);
      expect(result.ask.find((o) => o.publicId === ask2.publicId)!.filled).toBe(0);
      expect(result.ask.find((o) => o.publicId === ask3.publicId)!.filled).toBe(10);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Group 7 — Sort priority verification                              */
  /* ------------------------------------------------------------------ */
  describe('sort priority', () => {
    it('7a: asks sorted by price ascending — cheapest ask matched first', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 3 });
      const askCheap = mkOrder({ publicId: OrderPublicId('ask-cheap'), kind: 'ask', price: Cent.new(80n), quantity: 10 });
      const askExpensive = mkOrder({ publicId: OrderPublicId('ask-exp'), kind: 'ask', price: Cent.new(90n), quantity: 10 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [askExpensive, askCheap] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(3);
      expect(result.ask.find((o) => o.publicId === askCheap.publicId)!.filled).toBe(7);
      expect(result.ask.find((o) => o.publicId === askExpensive.publicId)!.filled).toBe(10);
    });

    it('7b: bids sorted by price descending — highest bid matched first', () => {
      const ask = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 3 });
      const bidHigh = mkOrder({ publicId: OrderPublicId('bid-high'), kind: 'bid', price: Cent.new(120n), quantity: 10 });
      const bidLow = mkOrder({ publicId: OrderPublicId('bid-low'), kind: 'bid', price: Cent.new(110n), quantity: 10 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'bid', price: Cent.new(50n), quantity: 100 });
      const orderBook: OrderBook = { bid: [bidLow, bidHigh], ask: [] };

      const result = processOrder({ order: ask, orderBook, ammOrder });

      expect(result.ask[0].filled).toBe(3);
      expect(result.bid.find((o) => o.publicId === bidHigh.publicId)!.filled).toBe(7);
      expect(result.bid.find((o) => o.publicId === bidLow.publicId)!.filled).toBe(10);
    });

    it('7c: same price — earlier createdAt matched first', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 3 });
      const askEarly = mkOrder({
        publicId: OrderPublicId('ask-early'),
        kind: 'ask',
        price: Cent.new(80n),
        quantity: 10,
        createdAt: new Date(now.getTime()),
      });
      const askLate = mkOrder({
        publicId: OrderPublicId('ask-late'),
        kind: 'ask',
        price: Cent.new(80n),
        quantity: 10,
        createdAt: new Date(now.getTime() + 1000),
      });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [askLate, askEarly] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(3);
      expect(result.ask.find((o) => o.publicId === askEarly.publicId)!.filled).toBe(7);
      expect(result.ask.find((o) => o.publicId === askLate.publicId)!.filled).toBe(10);
    });

    it('7d: same price, same time — larger quantity matched first', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 3 });
      const askLarge = mkOrder({
        publicId: OrderPublicId('ask-large'),
        kind: 'ask',
        price: Cent.new(80n),
        quantity: 10,
        createdAt: now,
      });
      const askSmall = mkOrder({
        publicId: OrderPublicId('ask-small'),
        kind: 'ask',
        price: Cent.new(80n),
        quantity: 5,
        createdAt: now,
      });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [askSmall, askLarge] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(3);
      expect(result.ask.find((o) => o.publicId === askLarge.publicId)!.filled).toBe(7);
      expect(result.ask.find((o) => o.publicId === askSmall.publicId)!.filled).toBe(5);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  Group 8 — Partially-filled counter orders                         */
  /* ------------------------------------------------------------------ */
  describe('partially-filled counter orders', () => {
    it('8a: counter ask with prior partial fill — only remaining capacity available', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ask = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 5, filled: 2 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(3);
      expect(result.ask[0].filled).toBe(0);
    });

    it('8b: counter ask fully filled (qty === filled) — excluded from matching', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const filledAsk = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 5, filled: 5 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
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
      const bid1 = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(90n), quantity: 5 });
      const bid2 = mkOrder({ publicId: OrderPublicId('bid-2'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [bid1], ask: [] };

      const result = processOrder({ order: bid2, orderBook, ammOrder });

      expect(result.bid).toHaveLength(2);
      expect(result.bid[0]).toBe(bid1);
      expect(result.bid[1]).toBe(bid2);
    });

    it('9b: unmatched counter orders remain unchanged in the returned book', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 3 });
      const ask1 = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 10 });
      const ask2 = mkOrder({ publicId: OrderPublicId('ask-2'), kind: 'ask', price: Cent.new(150n), quantity: 5 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask1, ask2] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      const returnedAsk2 = result.ask.find((o) => o.publicId === ask2.publicId);
      expect(returnedAsk2).toBeDefined();
      expect(returnedAsk2!.filled).toBe(0);
      expect(returnedAsk2!.quantity).toBe(5);
    });

    it('9c: ammOrder never appears in the returned order book', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(90n), quantity: 6 });

      const result = processOrder({ order: bid, orderBook: emptyBook, ammOrder });

      expect(result.ask).toHaveLength(0);
      expect(result.bid.every((o) => o.publicId !== ammOrder.publicId)).toBe(true);
    });

    it('9d: returned book always has both bid and ask keys as arrays', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });

      const noMatch = processOrder({ order: bid, orderBook: emptyBook, ammOrder });
      expect(Array.isArray(noMatch.bid)).toBe(true);
      expect(Array.isArray(noMatch.ask)).toBe(true);

      const ask = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 5 });
      const withMatch = processOrder({
        order: mkOrder({ publicId: OrderPublicId('bid-2'), kind: 'bid', price: Cent.new(100n), quantity: 3 }),
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
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 1 });
      const ask = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(80n), quantity: 1000 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(1);
      expect(result.ask[0].filled).toBe(999);
    });

    it('10b: price equality boundary — ask price === bid price should match', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 5 });
      const ask = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(100n), quantity: 5 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(5);
    });

    it('10c: ammOrder partially filled — only remaining capacity available', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 10 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(90n), quantity: 8, filled: 3 });

      const result = processOrder({ order: bid, orderBook: emptyBook, ammOrder });

      expect(result.bid[0].filled).toBe(5);
    });

    it('10d: all counter orders match but incoming order still not fully filled', () => {
      const bid = mkOrder({ publicId: OrderPublicId('bid-1'), kind: 'bid', price: Cent.new(100n), quantity: 20 });
      const ask1 = mkOrder({ publicId: OrderPublicId('ask-1'), kind: 'ask', price: Cent.new(70n), quantity: 3 });
      const ask2 = mkOrder({ publicId: OrderPublicId('ask-2'), kind: 'ask', price: Cent.new(80n), quantity: 5 });
      const ammOrder = mkOrder({ publicId: OrderPublicId('amm-1'), kind: 'ask', price: Cent.new(200n), quantity: 100 });
      const orderBook: OrderBook = { bid: [], ask: [ask1, ask2] };

      const result = processOrder({ order: bid, orderBook, ammOrder });

      expect(result.bid[0].filled).toBe(8);
      expect(result.bid[0].quantity).toBe(20);
      expect(result.bid).toHaveLength(1);
    });
  });
});

const mkPool = (rB: bigint, rQ: bigint): AmmPoolType => ({
  reserveBase: Units(rB),
  reserveQuote: Cent.new(rQ),
});

const stubMarket: Market = {
  id: MarketId(1),
  publicId: MarketPublicId('market-1'),
  baseAssetId: 1 as unknown as AssetId,
  quoteAssetId: 2 as unknown as AssetId,
  sequenceNumber: MarketSequenceNumber(0),
  ammPool: mkPool(100n, 200n),
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
};

/* ------------------------------------------------------------------ */
/*  Group 11 — buildAmmOrder + AMM reserve math                       */
/* ------------------------------------------------------------------ */
describe('buildAmmOrder', () => {
  it('11a: zero reserves -> inert order with quantity 0', () => {
    const pool = mkPool(0n, 0n);
    const order = buildAmmOrder(pool, stubMarket, 'ask');

    expect(order.quantity).toBe(0);
    expect(AmmPool.k(pool)).toBe(0n);
  });

  it('11b: reserveBase = 1 -> inert order', () => {
    const pool = mkPool(1n, 100n);
    const order = buildAmmOrder(pool, stubMarket, 'ask');

    expect(order.quantity).toBe(0);
  });

  it('11c: reserveQuote = 1 -> inert order', () => {
    const pool = mkPool(100n, 1n);
    const order = buildAmmOrder(pool, stubMarket, 'bid');

    expect(order.quantity).toBe(0);
  });

  it('11d: healthy pool, ask side — price = rQ/rB, quantity = rB - 1', () => {
    const pool = mkPool(100n, 200n);
    const order = buildAmmOrder(pool, { ...stubMarket, ammPool: pool }, 'ask');

    expect(order.price).toBe(Cent.new(200n / 100n));
    expect(order.quantity).toBe(99);
    expect(order.kind).toBe('ask');
  });

  it('11e: healthy pool, bid side — price = rQ/rB, quantity = k - rB', () => {
    const pool = mkPool(100n, 200n);
    const order = buildAmmOrder(pool, { ...stubMarket, ammPool: pool }, 'bid');

    expect(order.price).toBe(Cent.new(200n / 100n));
    expect(order.quantity).toBe(Number(AmmPool.k(pool) - pool.reserveBase));
    expect(order.kind).toBe('bid');
  });

  it('11f: inert ask order has MAX_SAFE_INTEGER price, inert bid order has 0 price', () => {
    const pool = mkPool(0n, 0n);
    const askOrder = buildAmmOrder(pool, stubMarket, 'ask');
    const bidOrder = buildAmmOrder(pool, stubMarket, 'bid');

    expect(askOrder.price).toBe(Cent.new(BigInt(Number.MAX_SAFE_INTEGER)));
    expect(bidOrder.price).toBe(Cent.new(0n));
  });

  it('11g: AMM ask quantity preserves reserveBase >= 1 after full fill', () => {
    const pool = mkPool(100n, 200n);
    const order = buildAmmOrder(pool, { ...stubMarket, ammPool: pool }, 'ask');

    const remainingBase = pool.reserveBase - BigInt(order.quantity);
    expect(remainingBase).toBeGreaterThanOrEqual(1n);
  });

  it('11h: AMM bid quantity preserves reserveQuote >= 1 after full fill', () => {
    const pool = mkPool(100n, 200n);
    const order = buildAmmOrder(pool, { ...stubMarket, ammPool: pool }, 'bid');

    const k = AmmPool.k(pool);
    const newRB = pool.reserveBase + BigInt(order.quantity);
    const newRQ = k / newRB;
    expect(newRQ).toBeGreaterThanOrEqual(1n);
  });
});

// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
/* ------------------------------------------------------------------ */
/*  Group 12 — filterNonceEligible                                     */
/* ------------------------------------------------------------------ */
describe('filterNonceEligible', () => {
  beforeEach(() => { counter = 0; });

  it('12a: single user, single order — keeps it', () => {
    const o1 = mkOrder({ publicId: OrderPublicId('o1'), kind: 'bid', price: Cent.new(100n), quantity: 5, nonce: Nonce(0) });
    const result = filterNonceEligible([o1]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(o1);
  });

  it('12b: single user, two orders — keeps only the lowest nonce', () => {
    const o1 = mkOrder({ publicId: OrderPublicId('o1'), kind: 'bid', price: Cent.new(100n), quantity: 5, nonce: Nonce(0) });
    const o2 = mkOrder({ publicId: OrderPublicId('o2'), kind: 'ask', price: Cent.new(90n), quantity: 3, nonce: Nonce(1) });
    const result = filterNonceEligible([o1, o2]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(o1);
  });

  it('12c: single user, three orders — keeps only the lowest nonce', () => {
    const o1 = mkOrder({ publicId: OrderPublicId('o1'), kind: 'bid', price: Cent.new(100n), quantity: 5, nonce: Nonce(3) });
    const o2 = mkOrder({ publicId: OrderPublicId('o2'), kind: 'ask', price: Cent.new(90n), quantity: 3, nonce: Nonce(5) });
    const o3 = mkOrder({ publicId: OrderPublicId('o3'), kind: 'bid', price: Cent.new(80n), quantity: 2, nonce: Nonce(4) });
    const result = filterNonceEligible([o1, o2, o3]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(o1);
  });

  it('12d: two users — keeps the lowest nonce per user independently', () => {
    const u1o1 = mkOrder({ publicId: OrderPublicId('u1o1'), kind: 'bid', price: Cent.new(100n), quantity: 5, userId: UserId(1), nonce: Nonce(0) });
    const u1o2 = mkOrder({ publicId: OrderPublicId('u1o2'), kind: 'bid', price: Cent.new(90n), quantity: 3, userId: UserId(1), nonce: Nonce(1) });
    const u2o1 = mkOrder({ publicId: OrderPublicId('u2o1'), kind: 'ask', price: Cent.new(80n), quantity: 4, userId: UserId(2), nonce: Nonce(5) });
    const u2o2 = mkOrder({ publicId: OrderPublicId('u2o2'), kind: 'ask', price: Cent.new(70n), quantity: 2, userId: UserId(2), nonce: Nonce(6) });

    const result = filterNonceEligible([u1o1, u1o2, u2o1, u2o2]);
    expect(result).toHaveLength(2);
    expect(result).toContain(u1o1);
    expect(result).toContain(u2o1);
  });

  it('12e: empty array — returns empty', () => {
    expect(filterNonceEligible([])).toHaveLength(0);
  });

  it('12f: all users have exactly one order — keeps all', () => {
    const o1 = mkOrder({ publicId: OrderPublicId('o1'), kind: 'bid', price: Cent.new(100n), quantity: 5, userId: UserId(1), nonce: Nonce(0) });
    const o2 = mkOrder({ publicId: OrderPublicId('o2'), kind: 'ask', price: Cent.new(90n), quantity: 3, userId: UserId(2), nonce: Nonce(0) });
    const o3 = mkOrder({ publicId: OrderPublicId('o3'), kind: 'bid', price: Cent.new(80n), quantity: 2, userId: UserId(3), nonce: Nonce(7) });

    const result = filterNonceEligible([o1, o2, o3]);
    expect(result).toHaveLength(3);
  });

  it('12g: works correctly with processOrder — nonce-blocked orders do not match', () => {
    const incoming = mkOrder({ publicId: OrderPublicId('incoming'), kind: 'bid', price: Cent.new(100n), quantity: 5, userId: UserId(10), nonce: Nonce(0) });

    const eligibleAsk = mkOrder({ publicId: OrderPublicId('ask-eligible'), kind: 'ask', price: Cent.new(90n), quantity: 3, userId: UserId(2), nonce: Nonce(0) });
    const blockedAsk = mkOrder({ publicId: OrderPublicId('ask-blocked'), kind: 'ask', price: Cent.new(80n), quantity: 10, userId: UserId(2), nonce: Nonce(1) });

    const ammOrder = mkOrder({ publicId: OrderPublicId('amm'), kind: 'ask', price: Cent.new(200n), quantity: 100 });

    const allOrders = [eligibleAsk, blockedAsk];
    const eligible = filterNonceEligible(allOrders);
    const orderBook: OrderBook = {
      bid: eligible.filter((o) => o.kind === 'bid'),
      ask: eligible.filter((o) => o.kind === 'ask'),
    };

    const result = processOrder({ order: incoming, orderBook, ammOrder });

    expect(result.bid[0].filled).toBe(3);
    expect(result.ask).toHaveLength(1);
    expect(result.ask[0].publicId).toBe(eligibleAsk.publicId);
  });
});
// end of LLM written Code
