// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import { E } from '@/lib/shared/imports';
import type { AssetId } from '../values/asset';
import type { TokenAmount, QuoteAmount } from '../values/currencies';
import type { UserId } from '../values/user';
import { AddBalanceValidationError, InsufficientBalanceError } from '../errors';
import type { CreateLedgerEntryParams } from '../ports/ledger';
import type { LedgerUnits } from '../aggregates/ledger';

export function creditUserBalance(p: {
  userId: UserId;
  assetId: AssetId;
  amount: TokenAmount | QuoteAmount;
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

export function debitUserBalance(p: {
  userId: UserId;
  assetId: AssetId;
  amount: TokenAmount | QuoteAmount;
  units: LedgerUnits;
  currentBalance: TokenAmount | QuoteAmount;
}): E.Effect<CreateLedgerEntryParams, AddBalanceValidationError | InsufficientBalanceError> {
  if (p.amount <= 0n) {
    return E.fail(new AddBalanceValidationError({ cause: 'Amount must be > 0' }));
  }
  if (p.currentBalance < p.amount) {
    return E.fail(new InsufficientBalanceError({ cause: 'Insufficient balance for withdrawal' }));
  }

  return E.succeed({
    userId: p.userId,
    assetId: p.assetId,
    drCr: 'dr',
    amount: p.amount,
    units: p.units,
  } satisfies CreateLedgerEntryParams);
}
// end of LLM written Code
