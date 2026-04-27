// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import type { E } from '@/lib/shared/imports';
import type { Order, OrderStatus, Side, Transaction } from '../aggregates/exchange';
import type { PortError } from '../errors';
import type { MarketId } from '../values/exchange';
import type { QuoteAmount, TokenAmount } from '../values/currencies';
import type { Nonce, UserId } from '../values/user';

// ── Order ────────────────────────────────────────────────────────────

export type CreateOrderParams = {
  marketId: MarketId;
  userId: UserId;
  side: Side;
  price: QuoteAmount;
  quantity: TokenAmount;
  stopLoss: QuoteAmount;
  marketSequenceNumber: number;
  nonce: Nonce;
  expiresAt: Date;
};

export type UpdateOrderFillsParams = {
  orderId: number;
  filled: TokenAmount;
  status: OrderStatus;
};

export interface OrderReadRepo<D> {
  getOpenOrdersByMarketId(marketId: MarketId): E.Effect<Order[], PortError, D>;
  getOrderById(orderId: number): E.Effect<Order, PortError, D>;
  // beginning of LLM written Code, Model: Claude Opus 4.7
  getOpenOrdersByUserId(userId: UserId): E.Effect<Order[], PortError, D>;
  // end of LLM written Code
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
  price: QuoteAmount;
  quantity: TokenAmount;
  side: Side;
  source: 'book' | 'amm';
};

export interface TransactionWriteRepo<D> {
  createTransactions(o: CreateTransactionParams[]): E.Effect<void, PortError, D>;
}

export interface TransactionReadRepo<D> {
  listByUserId(userId: UserId): E.Effect<Transaction[], PortError, D>;
}
// end of LLM written Code
