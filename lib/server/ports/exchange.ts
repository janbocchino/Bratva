// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import { eq, sql } from 'drizzle-orm';
import type { Order, Transaction } from '@/domain/aggregates/exchange';
import { InfraError, InfraNotFoundError, OrderNotFoundError, PortError } from '@/domain/errors';
import type {
  OrderReadRepo as OrderReadRepoDomain,
  OrderWriteRepo as OrderWriteRepoDomain,
  TransactionReadRepo as TransactionReadRepoDomain,
  TransactionWriteRepo as TransactionWriteRepoDomain,
  CreateOrderParams,
  CreateTransactionParams,
  UpdateOrderFillsParams,
} from '@/domain/ports/exchange';
import { QuoteAmount, TokenAmount } from '@/domain/values/currencies';
import { MarketId, OrderId, TransactionId } from '@/domain/values/exchange';
import { requireValidDate } from '@/domain/values/timestamp';
import { UserId } from '@/domain/values/user';
import { A, E, Fn } from '@/lib/shared/imports';
import { Db } from '../db';
import { orders, transactions } from '../schema';
import type { TransactionPrs } from '../schema';
import { orderMapper } from './mapper';

const errMapper =
  (WrappedError: typeof InfraNotFoundError | typeof InfraError | typeof OrderNotFoundError) =>
  (cause: unknown) =>
    new PortError({ cause: new WrappedError({ cause }) });

const transactionToDomain = (row: TransactionPrs): Transaction => ({
  id: TransactionId(row.id),
  marketId: MarketId(row.marketId),
  makerOrderId: row.makerOrderId === null ? null : OrderId(row.makerOrderId),
  takerOrderId: OrderId(row.takerOrderId),
  makerUserId: row.makerUserId === null ? null : UserId(row.makerUserId),
  takerUserId: UserId(row.takerUserId),
  price: QuoteAmount.new(row.price),
  quantity: TokenAmount.new(row.quantity),
  side: row.side,
  source: row.source,
  createdAt: requireValidDate(row.createdAt),
});

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
              .where(sql`${orders.marketId} = ${marketId} AND ${orders.status} = 'open'`),
          catch: errMapper(InfraError),
        }),
      ),
      E.map((rows) => rows.map(orderMapper.toDomain)),
    ),

  getOrderById: (orderId) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () => db.select().from(orders).where(eq(orders.id, orderId)).limit(1),
          catch: errMapper(InfraError),
        }),
      ),
      E.flatMap((rows) => Fn.pipe(A.head(rows), E.mapError(errMapper(OrderNotFoundError)))),
      E.map(orderMapper.toDomain),
    ),

  // beginning of LLM written Code, Model: Claude Opus 4.7
  getOpenOrdersByUserId: (userId) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db
              .select()
              .from(orders)
              .where(sql`${orders.userId} = ${userId} AND ${orders.status} = 'open'`),
          catch: errMapper(InfraError),
        }),
      ),
      E.map((rows) => rows.map(orderMapper.toDomain)),
    ),
  // end of LLM written Code
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
                // beginning of LLM written Code, Model: Claude Opus 4.5
                filled: 0n,
                // end of LLM written Code
                stopLoss: o.stopLoss,
                marketSequenceNumber: o.marketSequenceNumber,
                nonce: o.nonce,
                expiresAt: o.expiresAt,
              })
              .returning(),
          catch: errMapper(InfraError),
        }),
      ),
      E.flatMap((rows) => Fn.pipe(A.head(rows), E.mapError(errMapper(InfraError)))),
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

export const transactionReadRepo: TransactionReadRepoDomain<Db> = {
  listByUserId: (userId) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db
              .select()
              .from(transactions)
              .where(
                sql`${transactions.takerUserId} = ${userId} OR ${transactions.makerUserId} = ${userId}`,
              )
              .orderBy(sql`${transactions.createdAt} DESC`),
          catch: errMapper(InfraError),
        }),
      ),
      E.map((rows) => rows.map(transactionToDomain)),
    ),
};
// end of LLM written Code
