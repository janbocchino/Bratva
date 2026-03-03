import { Brand } from 'effect';

export type OrderId = Brand.Branded<number, 'OrderId'>;
export const OrderId = Brand.nominal<OrderId>();

export type OrderPublicId = Brand.Branded<string, 'OrderPublicId'>;
export const OrderPublicId = Brand.nominal<OrderPublicId>();

export type TransactionId = Brand.Branded<number, 'TransactionId'>;
export const TransactionId = Brand.nominal<TransactionId>();

export { MarketId, MarketPublicId, MarketSequenceNumber } from './market';
