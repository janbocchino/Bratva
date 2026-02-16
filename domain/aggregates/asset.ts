import type { AssetId, AssetName, AssetPublicId, AssetTicker } from '../values/asset';

/** The simplest representation of an asset in our domain. */
export type Asset = {
  id: AssetId;
  publicId: AssetPublicId;
  name: AssetName;
  ticker: AssetTicker;
  createdAt: Date;
  updatedAt: Date;
};
