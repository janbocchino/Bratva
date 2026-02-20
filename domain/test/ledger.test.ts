/// <reference types="jest" />
import { E, O } from '@/lib/shared/imports';
import * as Cause from 'effect/Cause';
import { creditUserBalance, debitUserBalance } from '../workflows/ledger';
import { UserId } from '../values/user';
import { AssetId } from '../values/asset';
import { Cent, Units } from '../values/currencies';
import { AddBalanceValidationError, InsufficientBalanceError } from '../errors';

describe('creditUserBalance', () => {
  const userId = UserId(1);
  const assetId = AssetId(100);
  const units = 'cent' as const;

  describe('success', () => {
    it('returns CreateLedgerEntryParams with drCr "cr" when amount > 0 (Cent)', async () => {
      const amount = Cent.new(100n);

      const result = await E.runPromise(creditUserBalance({ userId, assetId, amount, units }));

      expect(result).toEqual({
        userId,
        assetId,
        drCr: 'cr',
        amount,
        units,
      });
    });

    it('returns CreateLedgerEntryParams when amount > 0 (bigint Units)', async () => {
      const amount = Units(50n);

      const result = await E.runPromise(
        creditUserBalance({ userId, assetId, amount, units: 'unit' }),
      );

      expect(result.drCr).toBe('cr');
      expect(result.amount).toBe(amount);
      expect(result.units).toBe('unit');
    });
  });

  describe('validation failure', () => {
    it('fails with AddBalanceValidationError when amount is 0', async () => {
      const effect = creditUserBalance({
        userId,
        assetId,
        amount: Cent.new(0n),
        units,
      });

      const exit = await E.runPromiseExit(effect);
      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure') {
        const err = Cause.failureOption(exit.cause);
        expect(O.isSome(err)).toBe(true);
        if (O.isSome(err)) {
          expect(err.value).toMatchObject({
            _tag: 'AddBalanceValidationError',
            cause: 'Amount must be > 0',
          });
        }
      }
    });

    it('fails with AddBalanceValidationError when amount is negative', async () => {
      const effect = creditUserBalance({
        userId,
        assetId,
        amount: Cent.new(-10n),
        units,
      });

      const exit = await E.runPromiseExit(effect);
      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure') {
        const err = Cause.failureOption(exit.cause);
        expect(O.isSome(err)).toBe(true);
        if (O.isSome(err)) {
          expect(err.value).toMatchObject({ _tag: 'AddBalanceValidationError' });
        }
      }
    });
  });
});

describe('debitUserBalance', () => {
  const userId = UserId(1);
  const assetId = AssetId(100);
  const units = 'cent' as const;

  describe('success', () => {
    it('returns CreateLedgerEntryParams with drCr "dr" when amount > 0 (Cent)', async () => {
      const amount = Cent.new(100n);

      const result = await E.runPromise(
        debitUserBalance({ userId, assetId, amount, units, currentBalance: Cent.new(500n) }),
      );

      expect(result).toEqual({
        userId,
        assetId,
        drCr: 'dr',
        amount,
        units,
      });
    });

    it('returns CreateLedgerEntryParams when amount > 0 (bigint Units)', async () => {
      const amount = Units(50n);

      const result = await E.runPromise(
        debitUserBalance({ userId, assetId, amount, units: 'unit', currentBalance: Units(100n) }),
      );

      expect(result.drCr).toBe('dr');
      expect(result.amount).toBe(amount);
      expect(result.units).toBe('unit');
    });
  });

  describe('validation failure', () => {
    it('fails with AddBalanceValidationError when amount is 0', async () => {
      const effect = debitUserBalance({
        userId,
        assetId,
        amount: Cent.new(0n),
        units,
        currentBalance: Cent.new(500n),
      });

      const exit = await E.runPromiseExit(effect);
      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure') {
        const err = Cause.failureOption(exit.cause);
        expect(O.isSome(err)).toBe(true);
        if (O.isSome(err)) {
          expect(err.value).toMatchObject({
            _tag: 'AddBalanceValidationError',
            cause: 'Amount must be > 0',
          });
        }
      }
    });

    it('fails with AddBalanceValidationError when amount is negative', async () => {
      const effect = debitUserBalance({
        userId,
        assetId,
        amount: Cent.new(-10n),
        units,
        currentBalance: Cent.new(500n),
      });

      const exit = await E.runPromiseExit(effect);
      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure') {
        const err = Cause.failureOption(exit.cause);
        expect(O.isSome(err)).toBe(true);
        if (O.isSome(err)) {
          expect(err.value).toMatchObject({ _tag: 'AddBalanceValidationError' });
        }
      }
    });

    it('fails with InsufficientBalanceError when currentBalance < amount', async () => {
      const effect = debitUserBalance({
        userId,
        assetId,
        amount: Cent.new(200n),
        units,
        currentBalance: Cent.new(100n),
      });

      const exit = await E.runPromiseExit(effect);
      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure') {
        const err = Cause.failureOption(exit.cause);
        expect(O.isSome(err)).toBe(true);
        if (O.isSome(err)) {
          expect(err.value).toMatchObject({
            _tag: 'InsufficientBalanceError',
            cause: 'Insufficient balance for withdrawal',
          });
        }
      }
    });
  });

  describe('edge cases', () => {
    it('succeeds when currentBalance equals amount (exact withdrawal)', async () => {
      const amount = Cent.new(100n);

      const result = await E.runPromise(
        debitUserBalance({ userId, assetId, amount, units, currentBalance: Cent.new(100n) }),
      );

      expect(result).toEqual({
        userId,
        assetId,
        drCr: 'dr',
        amount,
        units,
      });
    });
  });
});
