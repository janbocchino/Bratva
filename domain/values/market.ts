import { Brand } from 'effect';

export type MarketId = Brand.Branded<number, 'MarketId'>;
export const MarketId = Brand.nominal<MarketId>();

export type MarketPublicId = Brand.Branded<string, 'MarketPublicId'>;
export const MarketPublicId = Brand.nominal<MarketPublicId>();

export type MarketSequenceNumber = Brand.Branded<number, 'MarketSequenceNumber'>;
export const MarketSequenceNumber = Brand.nominal<MarketSequenceNumber>();
