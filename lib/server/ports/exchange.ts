// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import { eq, inArray, sql } from 'drizzle-orm';
import type { Market, Order } from '@/domain/aggregates/exchange';
import {
  InfraError,
  InfraNotFoundError,
  MarketNotFoundError,
  OrderNotFoundError,
  PortError,
} from '@/domain/errors';
import type {
  MarketReadRepo as MarketReadRepoDomain,
  MarketWriteRepo as MarketWriteRepoDomain,
  OrderReadRepo as OrderReadRepoDomain,
  OrderWriteRepo as OrderWriteRepoDomain,
  TransactionWriteRepo as TransactionWriteRepoDomain,
  CreateOrderParams,
  CreateTransactionParams,
  UpdateMarketParams,
  UpdateOrderFillsParams,
} from '@/domain/ports/exchange';
import { A, E, Fn } from '@/lib/shared/imports';
import { Db } from '../db';
import { markets, orders, transactions } from '../schema';
import { marketMapper, orderMapper } from './mapper';

const errMapper =
  (
    WrappedError:
      | typeof InfraNotFoundError
      | typeof InfraError
      | typeof MarketNotFoundError
      | typeof OrderNotFoundError,
  ) =>
  (cause: unknown) =>
    new PortError({ cause: new WrappedError({ cause }) });

// ── Market ───────────────────────────────────────────────────────────

export const marketReadRepo: MarketReadRepoDomain<Db> = {
  getMarket: (o) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () => {
            const query =
              'id' in o ? eq(markets.id, o.id) : eq(markets.publicId, o.publicId);
            return db.select().from(markets).where(query).limit(1);
          },
          catch: errMapper(InfraError),
        }),
      ),
      E.flatMap((rows) =>
        Fn.pipe(A.head(rows), E.mapError(errMapper(MarketNotFoundError))),
      ),
      E.map(marketMapper.toDomain),
    ),
};

export const marketWriteRepo: MarketWriteRepoDomain<Db> = {
  updateMarketAfterMatch: (o: UpdateMarketParams) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db
              .update(markets)
              .set({
                sequenceNumber: o.sequenceNumber,
                ammReserveBase: o.ammReserveBase,
                ammReserveQuote: o.ammReserveQuote,
              })
              .where(eq(markets.id, o.marketId)),
          catch: errMapper(InfraError),
        }),
      ),
      E.asVoid,
    ),
};

// ── Order ────────────────────────────────────────────────────────────

export const orderReadRepo: OrderReadRepoDomain<Db> = {
  getOpenOrdersByMarketId: (marketId) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db
              .select()
              .from(orders)
              .where(
                sql`${orders.marketId} = ${marketId} AND ${orders.status} IN ('open', 'partially_filled')`,
              ),
          catch: errMapper(InfraError),
        }),
      ),
      E.map((rows) => rows.map(orderMapper.toDomain)),
    ),
};

export const orderWriteRepo: OrderWriteRepoDomain<Db> = {
  createOrder: (o: CreateOrderParams) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db
              .insert(orders)
              .values({
                marketId: o.marketId,
                userId: o.userId,
                side: o.side,
                price: o.price,
                quantity: o.quantity,
                stopLoss: o.stopLoss,
                marketSequenceNumber: o.marketSequenceNumber,
                expiresAt: o.expiresAt,
              })
              .returning(),
          catch: errMapper(InfraError),
        }),
      ),
      E.flatMap((rows) =>
        Fn.pipe(A.head(rows), E.mapError(errMapper(InfraError))),
      ),
      E.map(orderMapper.toDomain),
    ),

  updateOrderFills: (updates: UpdateOrderFillsParams[]) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.forEach(updates, (u) =>
          E.tryPromise({
            try: () =>
              db
                .update(orders)
                .set({ filled: u.filled, status: u.status })
                .where(eq(orders.id, u.orderId)),
            catch: errMapper(InfraError),
          }),
        ),
      ),
      E.asVoid,
    ),
};

// ── Transaction ──────────────────────────────────────────────────────

export const transactionWriteRepo: TransactionWriteRepoDomain<Db> = {
  createTransactions: (txns: CreateTransactionParams[]) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db.insert(transactions).values(
              txns.map((t) => ({
                marketId: t.marketId,
                makerOrderId: t.makerOrderId,
                takerOrderId: t.takerOrderId,
                makerUserId: t.makerUserId,
                takerUserId: t.takerUserId,
                price: t.price,
                quantity: t.quantity,
                side: t.side,
                source: t.source,
              })),
            ),
          catch: errMapper(InfraError),
        }),
      ),
      E.asVoid,
    ),
};
// end of LLM written Code
