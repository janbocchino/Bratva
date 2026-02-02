import { Brand } from 'effect';

export type AssetId = Brand.Branded<number, 'AssetId'>;
export const AssetId = Brand.nominal<AssetId>();

export type AssetName = Brand.Branded<string, 'AssetName'>;
export const AssetName = Brand.nominal<AssetName>();

export type AssetTicker = Brand.Branded<string, 'AssetTicker'>;
export const AssetTicker = Brand.nominal<AssetTicker>();