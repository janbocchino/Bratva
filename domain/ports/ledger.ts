// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import type { E } from '@/lib/shared/imports';
import type { UserLedger, LedgerUnits } from '../aggregates/ledger';
import type { AssetId } from '../values/asset';
import type { TokenAmount, QuoteAmount } from '../values/currencies';
import type { UserId } from '../values/user';
import type { PortError } from '../errors';

export interface LedgerReadRepo<D> {
  getLedgerByUserId(userId: UserId): E.Effect<UserLedger, PortError, D>;
}

export type LedgerDrCr = 'dr' | 'cr';

export type CreateLedgerEntryParams = {
  userId: UserId;
  assetId: AssetId;
  drCr: LedgerDrCr;
  amount: TokenAmount | QuoteAmount;
  units: LedgerUnits;
};

export interface LedgerWriteRepo<D> {
  createEntry(o: CreateLedgerEntryParams): E.Effect<void, PortError, D>;
}

export type { LedgerUnits };
// end of LLM written Code
