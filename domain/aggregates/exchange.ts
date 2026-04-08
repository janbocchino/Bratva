// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import type { QuoteAmount, TokenAmount } from '../values/currencies';
import type {
  OrderId,
  OrderPublicId,
  MarketId,
  MarketPublicId,
  MarketSequenceNumber,
  TransactionId,
} from '../values/exchange';
import type { Nonce, UserId } from '../values/user';

export type Side = 'bid' | 'ask';

export type OrderStatus = 'open' | 'filled' | 'cancelled' | 'expired';

export type Order = {
  id: OrderId;
  publicId: OrderPublicId;
  marketId: MarketId;
  userId: UserId;
  kind: Side;
  price: QuoteAmount;
  quantity: TokenAmount;
  filled: TokenAmount;
  stopLoss: QuoteAmount;
  marketSequenceNumber: MarketSequenceNumber;
  nonce: Nonce;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  canceled: boolean;
  canceledAt: Date;
};

export const Order = {
  cancel: (o: Order, canceledAt: Date): Order => ({
    ...o,
    canceled: true,
    canceledAt,
    status: 'cancelled' as OrderStatus,
  }),
};

export type OrderBook = {
  bid: Order[];
  ask: Order[];
};

export type Transaction = {
  id: TransactionId;
  marketId: MarketId;
  makerOrderId: OrderId | null;
  takerOrderId: OrderId;
  makerUserId: UserId | null;
  takerUserId: UserId;
  price: QuoteAmount;
  quantity: TokenAmount;
  side: Side;
  source: 'book' | 'amm';
  createdAt: Date;
};
// end of LLM written Code
