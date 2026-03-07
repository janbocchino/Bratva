import type { AssetId } from '../values/asset';
import type { Cent, Units } from '../values/currencies';
import type { UserId } from '../values/user';

export type UserLedger = {
  userId: UserId;
  summary: {
    assetId: AssetId;
    balance: Cent | Units;
    units: 'cent' | 'unit';
  }[];
  transactions: {
    assetId: AssetId;
    drCr: 'dr' | 'cr';
    amount: Cent | Units;
    units: 'cent' | 'unit';
    createdAt: Date;
  }[];
};
