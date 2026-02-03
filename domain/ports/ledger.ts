import type { E } from '@/lib/shared/imports';
import type { UserLedger } from '../aggregates/ledger';
import type { UserId } from '../values/user';
import type { PortError } from './errors';

export interface LedgerReadRepo<D> {
	getLedgerByUserId(userId: UserId): E.Effect<UserLedger, PortError, D>;
}
