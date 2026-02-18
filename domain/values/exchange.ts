import { Brand } from 'effect';

export type OrderId = Brand.Branded<number, 'OrderId'>;
export const OrderId = Brand.nominal<OrderId>();

export type OrderPublicId = Brand.Branded<string, 'OrderPublicId'>;
export const OrderPublicId = Brand.nominal<OrderPublicId>();

export type MarketId = Brand.Branded<number, 'MarketId'>;
export const MarketId = Brand.nominal<MarketId>();

export type MarketPublicId = Brand.Branded<string, 'MarketPublicId'>;
export const MarketPublicId = Brand.nominal<MarketPublicId>();

export type TransactionId = Brand.Branded<number, 'TransactionId'>;
export const TransactionId = Brand.nominal<TransactionId>();

export type MarketSequenceNumber = Brand.Branded<number, 'MarketSequenceNumber'>;
export const MarketSequenceNumber = Brand.nominal<MarketSequenceNumber>();
