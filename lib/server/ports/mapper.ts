// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import type { Asset } from '@/domain/aggregates/asset';
import type { Market } from '@/domain/aggregates/market';
import type { Order, OrderStatus } from '@/domain/aggregates/exchange';
import type { UserLedger } from '@/domain/aggregates/ledger';
import type { PriceSeries } from '@/domain/aggregates/price-series';
import type { User } from '@/domain/aggregates/user';
import { A } from '@/lib/shared/imports';
import type { Mapper as MapperPort, ReadMapper as ReadMapperPort } from '@/domain/ports/mapper';
import { AssetId, AssetName, AssetPublicId, AssetTicker } from '@/domain/values/asset';
import { TokenAmount, QuoteAmount, LpTokens } from '@/domain/values/currencies';
import {
  MarketId,
  MarketPublicId,
  MarketSequenceNumber,
  OrderId,
  OrderPublicId,
} from '@/domain/values/exchange';
import { PriceSeriesId, PriceSeriesPublicId } from '@/domain/values/price-series';
import { requireValidDate } from '@/domain/values/timestamp';
import {
  Nonce,
  UserDisplayName,
  UserEmail,
  UserId,
  UserPublicId,
  UserRole,
} from '@/domain/values/user';
import type {
  AssetPrs,
  LedgerEntryPrs,
  MarketPrs,
  OrderPrs,
  PriceSeriesPrs,
  UserPrs,
} from '../schema';

export const userMapper: MapperPort<User, UserPrs> = {
  toDomain: (p) => ({
    id: UserId(p.id),
    publicId: UserPublicId(p.publicId),
    displayName: UserDisplayName(p.displayName),
    email: UserEmail(p.email),
    // beginning of LLM written Code, Model: GPT-5.5
    role: UserRole.from(p.role),
    // end of LLM written Code
    createdAt: requireValidDate(p.createdAt),
    updatedAt: requireValidDate(p.updatedAt),
    nonce: Nonce(p.nonce),
  }),
  toPersistence: (d) => ({
    id: d.id,
    publicId: d.publicId,
    displayName: d.displayName,
    email: d.email,
    // beginning of LLM written Code, Model: GPT-5.5
    role: d.role,
    // end of LLM written Code
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    nonce: d.nonce,
  }),
};

export const assetMapper: MapperPort<Asset, AssetPrs> = {
  toDomain: (p) => ({
    id: AssetId(p.id),
    publicId: AssetPublicId(p.publicId),
    name: AssetName(p.name),
    ticker: AssetTicker(p.ticker),
    createdAt: requireValidDate(p.createdAt),
    updatedAt: requireValidDate(p.updatedAt),
  }),
  toPersistence: (d) => ({
    id: d.id,
    publicId: d.publicId,
    name: d.name,
    ticker: d.ticker,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }),
};

export const priceSeriesMapper: MapperPort<PriceSeries, PriceSeriesPrs> = {
  toDomain: (p) => ({
    id: PriceSeriesId(p.id),
    publicId: PriceSeriesPublicId(p.publicId),
    assetId: AssetId(p.assetId),
    price: QuoteAmount.new(p.price),
    createdAt: requireValidDate(p.createdAt),
  }),
  toPersistence: (d) => ({
    id: d.id,
    publicId: d.publicId,
    assetId: d.assetId,
    price: d.price,
    createdAt: d.createdAt,
  }),
};

// beginning of LLM written Code, Model: Claude Opus 4.5
/*
Ledger balances are not taken from SQL `SUM(...)::TEXT`: SQLite promotes large sums to REAL,
then stringifies as scientific notation (e.g. 1e+29), which breaks strict numeric string parsing.
We fold amounts in TypeScript with bigint instead.
*/
// end of LLM written Code

const parseLedgerCreatedAt = (createdAt: unknown): Date => requireValidDate(createdAt);

export const ledgerEntryMapper: ReadMapperPort<UserLedger, LedgerEntryPrs[]> = {
  toDomain: (rows: LedgerEntryPrs[]): UserLedger => {
    if (rows.length === 0) {
      return { userId: UserId(0), summary: [], transactions: [] };
    }

    const summaryBalances = new Map<string, bigint>();
    for (const row of rows) {
      const key = `${row.assetId}:${row.units}`;
      const delta = row.drCr === 'cr' ? row.amount : -row.amount;
      summaryBalances.set(key, (summaryBalances.get(key) ?? 0n) + delta);
    }

    const summary: UserLedger['summary'] = [...summaryBalances.entries()].map(([key, balance]) => {
      const colon = key.indexOf(':');
      const assetId = AssetId(Number(key.slice(0, colon)));
      const units = key.slice(colon + 1) as UserLedger['summary'][number]['units'];
      return {
        assetId,
        balance: units === 'scaled_unit' ? TokenAmount.new(balance) : QuoteAmount.new(balance),
        units,
      };
    });

    return {
      userId: UserId(rows[0].userId),
      summary,
      transactions: rows.map(({ assetId, drCr, amount, units, createdAt }) => ({
        assetId: AssetId(assetId),
        drCr,
        amount: units === 'scaled_unit' ? TokenAmount.new(amount) : QuoteAmount.new(amount),
        units,
        createdAt: parseLedgerCreatedAt(createdAt),
      })),
    };
  },
};

export const marketMapper: MapperPort<Market, MarketPrs> = {
  toDomain: (p) => ({
    id: MarketId(p.id),
    publicId: MarketPublicId(p.publicId),
    baseAssetId: AssetId(p.baseAssetId),
    quoteAssetId: AssetId(p.quoteAssetId),
    sequenceNumber: MarketSequenceNumber(p.sequenceNumber),
    ammPool: {
      reserveBase: TokenAmount.new(p.ammReserveBase),
      reserveQuote: QuoteAmount.new(p.ammReserveQuote),
    },
    modelPrice: QuoteAmount.new(0n),
    totalLpTokens: LpTokens.new(p.totalLpTokens),
    status: p.status,
    wasPreviouslyActive: p.wasPreviouslyActive,
    createdAt: requireValidDate(p.createdAt),
    updatedAt: requireValidDate(p.updatedAt),
  }),
  toPersistence: (d) => ({
    id: d.id,
    publicId: d.publicId,
    baseAssetId: d.baseAssetId,
    quoteAssetId: d.quoteAssetId,
    sequenceNumber: d.sequenceNumber,
    ammReserveBase: d.ammPool.reserveBase,
    ammReserveQuote: d.ammPool.reserveQuote,
    totalLpTokens: d.totalLpTokens,
    status: d.status,
    wasPreviouslyActive: d.wasPreviouslyActive,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }),
};

export const orderMapper: MapperPort<Order, OrderPrs> = {
  toDomain: (p) => ({
    id: OrderId(p.id),
    publicId: OrderPublicId(p.publicId),
    marketId: MarketId(p.marketId),
    userId: UserId(p.userId),
    kind: p.side,
    price: QuoteAmount.new(p.price),
    quantity: TokenAmount.new(p.quantity),
    filled: TokenAmount.new(p.filled),
    stopLoss: QuoteAmount.new(p.stopLoss),
    marketSequenceNumber: MarketSequenceNumber(p.marketSequenceNumber),
    nonce: Nonce(p.nonce),
    status: p.status as OrderStatus,
    createdAt: requireValidDate(p.createdAt),
    updatedAt: requireValidDate(p.updatedAt),
    expiresAt: requireValidDate(p.expiresAt),
    canceled: p.status === 'cancelled',
    canceledAt: p.status === 'cancelled' ? requireValidDate(p.updatedAt) : new Date(0),
  }),
  toPersistence: (d) => ({
    id: d.id,
    publicId: d.publicId,
    marketId: d.marketId,
    userId: d.userId,
    side: d.kind,
    price: d.price,
    quantity: d.quantity,
    filled: d.filled,
    stopLoss: d.stopLoss,
    marketSequenceNumber: d.marketSequenceNumber,
    nonce: d.nonce,
    status: d.status,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    expiresAt: d.expiresAt,
  }),
};
// end of LLM written Code
