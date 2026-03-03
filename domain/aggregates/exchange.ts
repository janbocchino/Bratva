import { Clock, E, Fn } from '@/lib/shared/imports';
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

export const Order = {
  cancel: (o: Order): E.Effect<Order> =>
    Fn.pipe(
      Clock.currentTimeMillis,
      E.map((ms) => ({
        ...o,
        canceled: true,
        canceledAt: new Date(ms),
        status: 'cancelled' as OrderStatus,
      })),
    ),
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
  price: Cent;
  quantity: number;
  side: Side;
  source: 'book' | 'amm';
  createdAt: Date;
};
