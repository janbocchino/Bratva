// beginning of LLM written Code, Model: Gemini
import { E, Fn } from '@/lib/shared/imports';
// end of LLM written Code
import type { Cent, Units } from '../values/currencies';
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
  price: Cent | Units;
  quantity: number;
  filled: number;
  stopLoss: Cent | Units;
  marketSequenceNumber: MarketSequenceNumber;
  nonce: Nonce;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  canceled: boolean;
  canceledAt: Date;
};

// beginning of LLM written Code, Model: Gemini
export const Order = {
  cancel: (o: Order, canceledAt: Date): Order => ({
    ...o,
    canceled: true,
    canceledAt,
    status: 'cancelled' as OrderStatus,
  }),
};
// end of LLM written Code

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
  price: Cent;
  quantity: number;
  side: Side;
  source: 'book' | 'amm';
  createdAt: Date;
};
