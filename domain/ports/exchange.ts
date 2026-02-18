// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import { type } from 'arktype';
import type { E } from '@/lib/shared/imports';
import type { Market, Order, OrderStatus, Side } from '../aggregates/exchange';
import type { PortError } from '../errors';
import type { MarketId } from '../values/exchange';
import type { Cent, Units } from '../values/currencies';
import type { Nonce, UserId } from '../values/user';

// ── Market ───────────────────────────────────────────────────────────

export const GetMarketParams = type({
  id: 'number',
}).or({
  publicId: 'string',
});

export type GetMarketParams = typeof GetMarketParams.infer;

export interface MarketReadRepo<D> {
  getMarket(o: GetMarketParams): E.Effect<Market, PortError, D>;
}

export type UpdateMarketParams = {
  marketId: MarketId;
  sequenceNumber: number;
  ammReserveBase: bigint;
  ammReserveQuote: bigint;
};

export interface MarketWriteRepo<D> {
  updateMarketAfterMatch(o: UpdateMarketParams): E.Effect<void, PortError, D>;
}

// ── Order ────────────────────────────────────────────────────────────

export type CreateOrderParams = {
  marketId: MarketId;
  userId: UserId;
  side: Side;
  price: Cent | Units;
  quantity: number;
  stopLoss: Cent | Units;
  marketSequenceNumber: number;
  // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
  nonce: Nonce;
  // end of LLM written Code
  expiresAt: Date;
};

export type UpdateOrderFillsParams = {
  orderId: number;
  filled: number;
  status: OrderStatus;
};

export interface OrderReadRepo<D> {
  getOpenOrdersByMarketId(marketId: MarketId): E.Effect<Order[], PortError, D>;
  getOrderById(orderId: number): E.Effect<Order, PortError, D>;
}

export interface OrderWriteRepo<D> {
  createOrder(o: CreateOrderParams): E.Effect<Order, PortError, D>;
  updateOrderFills(o: UpdateOrderFillsParams[]): E.Effect<void, PortError, D>;
}

// ── Transaction ──────────────────────────────────────────────────────

export type CreateTransactionParams = {
  marketId: MarketId;
  makerOrderId: number | null;
  takerOrderId: number;
  makerUserId: number | null;
  takerUserId: number;
  price: Cent;
  quantity: number;
  side: Side;
  source: 'book' | 'amm';
};

export interface TransactionWriteRepo<D> {
  createTransactions(o: CreateTransactionParams[]): E.Effect<void, PortError, D>;
}
// end of LLM written Code
