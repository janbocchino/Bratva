import { Clock, E, Fn } from '@/lib/shared/imports';
import type { AssetId } from '../values/asset';
import type { Cent, Units } from '../values/currencies';
import type { OrderId, MarketSequenceNumber } from '../values/exchange';
import type { Nonce } from '../values/user';


export type Side = 'bid' | 'ask';

// Order Book

export type Order = {
  id: OrderId;
  kind: Side;
  price: Cent | Units;
  quantity: number;
  filled: number;
  stopLoss: Cent | number | Units;
  marketSequenceNumber: MarketSequenceNumber;
  nonce: Nonce;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  canceled: boolean;
  canceledAt: Date;
};

const Order = {
  cancel: (o: Order): E.Effect<Order> =>
    Fn.pipe(
      Clock.currentTimeMillis,
      E.map((ms) => ({
        ...o,
        canceled: true,
        canceledAt: new Date(ms),
      })),
    ),
};

export type OrderBook = {
  bids: Order[];
  asks: Order[];
};

// AMM Pool

export type AmmPool = {
  reserveBase: Units;
  reserveQuote: Cent;
};

export const AmmPool = {
  k: (p: AmmPool) => BigInt(p.reserveBase) * BigInt(p.reserveQuote),
};

// Exchange State

export type MarketState = {
  marketSequenceNumber: MarketSequenceNumber;
  baseAssetId: AssetId;
  quoteAssetId: AssetId;
  orderBook: OrderBook;
  ammPool: AmmPool;
};
