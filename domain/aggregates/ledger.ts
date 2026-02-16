import { AssetId } from '../values/asset';
import { Cent, Units } from '../values/currencies';
import { UserId } from '../values/user';

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
