import { Brand } from 'effect';

export type OrderId = Brand.Branded<string, 'OrderId'>;
export const OrderId = Brand.nominal<OrderId>();

export type MarketSequenceNumber = Brand.Branded<number, 'MarketSequenceNumber'>;
export const MarketSequenceNumber = Brand.nominal<MarketSequenceNumber>();