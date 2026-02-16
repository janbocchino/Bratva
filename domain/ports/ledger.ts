import type { E } from '@/lib/shared/imports';
import type { UserLedger } from '../aggregates/ledger';
import type { AssetId } from '../values/asset';
import type { Cent, Units } from '../values/currencies';
import type { UserId } from '../values/user';
import type { PortError } from './errors';

export interface LedgerReadRepo<D> {
  getLedgerByUserId(userId: UserId): E.Effect<UserLedger, PortError, D>;
}

export type LedgerUnits = 'cent' | 'unit';
export type LedgerDrCr = 'dr' | 'cr';

export type CreateLedgerEntryParams = {
  userId: UserId;
  assetId: AssetId;
  drCr: LedgerDrCr;
  amount: Cent | Units;
  units: LedgerUnits;
};

export interface LedgerWriteRepo<D> {
  createEntry(o: CreateLedgerEntryParams): E.Effect<void, PortError, D>;
}
