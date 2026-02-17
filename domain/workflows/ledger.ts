import { E } from '@/lib/shared/imports';
import type { AssetId } from '../values/asset';
import type { Cent, Units } from '../values/currencies';
import type { UserId } from '../values/user';
import { AddBalanceValidationError } from '../errors';
import type { CreateLedgerEntryParams, LedgerUnits } from '../ports/ledger';

export function creditUserBalance(p: {
  userId: UserId;
  assetId: AssetId;
  amount: Cent | Units;
  units: LedgerUnits;
}): E.Effect<CreateLedgerEntryParams, AddBalanceValidationError> {
  if (p.amount <= 0n) {
    return E.fail(new AddBalanceValidationError({ cause: 'Amount must be > 0' }));
  }

  return E.succeed({
    userId: p.userId,
    assetId: p.assetId,
    drCr: 'cr',
    amount: p.amount,
    units: p.units,
  } satisfies CreateLedgerEntryParams);
}

