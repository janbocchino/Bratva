// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
/// <reference types="jest" />
import { E, O } from '@/lib/shared/imports';
import * as Cause from 'effect/Cause';
import { creditUserBalance, debitUserBalance } from '../workflows/ledger';
import { UserId } from '../values/user';
import { AssetId } from '../values/asset';
import { TokenAmount, QuoteAmount, SCALE } from '../values/currencies';
import { AddBalanceValidationError, InsufficientBalanceError } from '../errors';

describe('creditUserBalance', () => {
  const userId = UserId(1);
  const assetId = AssetId(100);
  const units = 'cent' as const;

  describe('success', () => {
    it('returns CreateLedgerEntryParams with drCr "cr" when amount > 0 (QuoteAmount)', async () => {
      const amount = QuoteAmount.new(100n * SCALE);

      const result = await E.runPromise(creditUserBalance({ userId, assetId, amount, units }));

      expect(result).toEqual({
        userId,
        assetId,
        drCr: 'cr',
        amount,
        units,
      });
    });

    it('returns CreateLedgerEntryParams when amount > 0 (TokenAmount)', async () => {
      const amount = TokenAmount.new(50n * SCALE);

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
        amount: QuoteAmount.zero,
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
        amount: QuoteAmount.new(-10n),
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
    it('returns CreateLedgerEntryParams with drCr "dr" when amount > 0 (QuoteAmount)', async () => {
      const amount = QuoteAmount.new(100n * SCALE);

      const result = await E.runPromise(
        debitUserBalance({
          userId,
          assetId,
          amount,
          units,
          currentBalance: QuoteAmount.new(500n * SCALE),
        }),
      );

      expect(result).toEqual({
        userId,
        assetId,
        drCr: 'dr',
        amount,
        units,
      });
    });

    it('returns CreateLedgerEntryParams when amount > 0 (TokenAmount)', async () => {
      const amount = TokenAmount.new(50n * SCALE);

      const result = await E.runPromise(
        debitUserBalance({
          userId,
          assetId,
          amount,
          units: 'unit',
          currentBalance: TokenAmount.new(100n * SCALE),
        }),
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
        amount: QuoteAmount.zero,
        units,
        currentBalance: QuoteAmount.new(500n * SCALE),
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
        amount: QuoteAmount.new(-10n),
        units,
        currentBalance: QuoteAmount.new(500n * SCALE),
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
        amount: QuoteAmount.new(200n * SCALE),
        units,
        currentBalance: QuoteAmount.new(100n * SCALE),
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
      const amount = QuoteAmount.new(100n * SCALE);

      const result = await E.runPromise(
        debitUserBalance({
          userId,
          assetId,
          amount,
          units,
          currentBalance: QuoteAmount.new(100n * SCALE),
        }),
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
// end of LLM written Code
