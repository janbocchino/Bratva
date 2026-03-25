import type { Asset } from '@/domain/aggregates/asset';
import type { Market } from '@/domain/aggregates/market';
import type { Order, OrderStatus } from '@/domain/aggregates/exchange';
import type { UserLedger } from '@/domain/aggregates/ledger';
import type { PriceSeries } from '@/domain/aggregates/price-series';
import type { User } from '@/domain/aggregates/user';
import { A } from '@/lib/shared/imports';
import type { Mapper as MapperPort, ReadMapper as ReadMapperPort } from '@/domain/ports/mapper';
import { AssetId, AssetName, AssetPublicId, AssetTicker } from '@/domain/values/asset';
import { Cent, Units } from '@/domain/values/currencies';
import {
  MarketId,
  MarketPublicId,
  MarketSequenceNumber,
  OrderId,
  OrderPublicId,
} from '@/domain/values/exchange';
import { PriceSeriesId, PriceSeriesPublicId } from '@/domain/values/price-series';
// beginning of LLM written Code, Model: gpt-5.3-codex
import { requireValidDate } from '@/domain/values/timestamp';
// end of LLM written Code
import { Nonce, UserDisplayName, UserEmail, UserId, UserPublicId } from '@/domain/values/user';
import type {
  AssetPrs,
  LedgerEntryWithBalancePrs,
  MarketPrs,
  OrderPrs,
  PriceSeriesPrs,
  UserPrs,
} from '../schema';
import { type } from 'arktype';

export const userMapper: MapperPort<User, UserPrs> = {
  toDomain: (p) => ({
    id: UserId(p.id),
    publicId: UserPublicId(p.publicId),
    displayName: UserDisplayName(p.displayName),
    email: UserEmail(p.email),
    // beginning of LLM written Code, Model: gpt-5.3-codex
    createdAt: requireValidDate(p.createdAt),
    updatedAt: requireValidDate(p.updatedAt),
    // end of LLM written Code
    nonce: Nonce(p.nonce),
  }),
  toPersistence: (d) => ({
    id: d.id,
    publicId: d.publicId,
    displayName: d.displayName,
    email: d.email,
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
    // beginning of LLM written Code, Model: gpt-5.3-codex
    createdAt: requireValidDate(p.createdAt),
    updatedAt: requireValidDate(p.updatedAt),
    // end of LLM written Code
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
    price: Cent.new(p.price),
    // beginning of LLM written Code, Model: gpt-5.3-codex
    createdAt: requireValidDate(p.createdAt),
    // end of LLM written Code
  }),
  toPersistence: (d) => ({
    id: d.id,
    publicId: d.publicId,
    assetId: d.assetId,
    price: d.price,
    createdAt: d.createdAt,
  }),
};

const balanceToBigInt = type('string.numeric.parse').pipe(Math.trunc).pipe(BigInt);

// beginning of LLM written Code, Model: gpt-5.3-codex
const parseLedgerCreatedAt = (createdAt: unknown): Date => requireValidDate(createdAt);
// end of LLM written Code

export const ledgerEntryMapper: ReadMapperPort<UserLedger, LedgerEntryWithBalancePrs[]> = {
  toDomain: (p: LedgerEntryWithBalancePrs[]): UserLedger => {
    if (p.length === 0) {
      return { userId: UserId(0), summary: [], transactions: [] };
    }

    const summaryMap = new Map<string, UserLedger['summary'][number]>();
    for (const row of p) {
      const key = `${row.assetId}:${row.units}`;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          assetId: AssetId(row.assetId),
          balance:
            row.units === 'cent'
              ? Cent.new(balanceToBigInt.assert(row.balance))
              : Units(balanceToBigInt.assert(row.balance)),
          units: row.units,
        });
      }
    }

    return {
      userId: UserId(p[0].userId),
      summary: [...summaryMap.values()],
      transactions: p.map(({ assetId, drCr, amount, units, createdAt }) => ({
        assetId: AssetId(assetId),
        drCr: drCr,
        amount: units === 'cent' ? Cent.new(amount) : Units(amount),
        units: units,
        // beginning of LLM written Code, Model: gpt-5.3-codex
        createdAt: parseLedgerCreatedAt(createdAt),
        // end of LLM written Code
      })),
    };
  },
};
// end of LLM written Code

// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
export const marketMapper: MapperPort<Market, MarketPrs> = {
  toDomain: (p) => ({
    id: MarketId(p.id),
    publicId: MarketPublicId(p.publicId),
    baseAssetId: AssetId(p.baseAssetId),
    quoteAssetId: AssetId(p.quoteAssetId),
    sequenceNumber: MarketSequenceNumber(p.sequenceNumber),
    ammPool: {
      reserveBase: Units(p.ammReserveBase),
      reserveQuote: Cent.new(p.ammReserveQuote),
    },
    // beginning of LLM written Code, Model: gpt-5.3-codex
    // `markets` no longer stores model price; read paths must hydrate this separately.
    modelPrice: Cent.new(0n),
    // end of LLM written Code
    totalLpTokens: p.totalLpTokens,
    status: p.status,
    // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
    wasPreviouslyActive: p.wasPreviouslyActive,
    // end of LLM written Code
    // beginning of LLM written Code, Model: gpt-5.3-codex
    createdAt: requireValidDate(p.createdAt),
    updatedAt: requireValidDate(p.updatedAt),
    // end of LLM written Code
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
    // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
    wasPreviouslyActive: d.wasPreviouslyActive,
    // end of LLM written Code
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
    price: Cent.new(p.price),
    quantity: p.quantity,
    filled: p.filled,
    stopLoss: Cent.new(p.stopLoss),
    marketSequenceNumber: MarketSequenceNumber(p.marketSequenceNumber),
    nonce: Nonce(p.nonce),
    status: p.status as OrderStatus,
    // beginning of LLM written Code, Model: gpt-5.3-codex
    createdAt: requireValidDate(p.createdAt),
    updatedAt: requireValidDate(p.updatedAt),
    expiresAt: requireValidDate(p.expiresAt),
    // end of LLM written Code
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
