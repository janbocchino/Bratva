import { Brand } from "effect";

export type PriceSeriesId = Brand.Branded<number, 'PriceSeriesId'>;
export const PriceSeriesId = Brand.nominal<PriceSeriesId>();

export type PriceSeriesPublicId = Brand.Branded<string, 'PriceSeriesPublicId'>;
export const PriceSeriesPublicId = Brand.nominal<PriceSeriesPublicId>();
