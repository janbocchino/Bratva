import type { 
    AssetId, 
    AssetName, 
    AssetTicker 
} from '../values/asset';

/** The simplest representation of an asset in our domain. */

export type Asset = {
	id: AssetId;
	name: AssetName;
	ticker: AssetTicker;
	createdAt: Date;
	updatedAt: Date;
};