/// <reference types="jest" />
import { E, O } from '@/lib/shared/imports';
import * as Cause from 'effect/Cause';
import { createUserAccount } from '../workflows/user';
import type { DbSnapshot } from '../workflows/user';
import { UserId, UserEmail, UserDisplayName, UserRole } from '../values/user';

const mkSnapshot = (overrides: Partial<DbSnapshot> = {}): DbSnapshot => ({
  emailToUserId: new Map(),
  displayNameToUserId: new Map(),
  ...overrides,
});

describe('createUserAccount', () => {
  const displayName = UserDisplayName('alice');
  const email = UserEmail('alice@example.com');

  describe('success', () => {
    it('returns displayName and email when neither exists in snapshot', async () => {
      const snapshot = mkSnapshot();

      const result = await E.runPromise(createUserAccount({ displayName, email }, snapshot));

      expect(result).toEqual({ displayName, email });
    });

    it('succeeds when snapshot has other users but not this email or displayName', async () => {
      const otherEmail = UserEmail('bob@example.com');
      const otherDisplayName = UserDisplayName('bob');
      const snapshot = mkSnapshot({
        emailToUserId: new Map([[otherEmail, UserId(2)]]),
        displayNameToUserId: new Map([[otherDisplayName, UserId(2)]]),
      });

      const result = await E.runPromise(createUserAccount({ displayName, email }, snapshot));

      expect(result).toEqual({ displayName, email });
    });
  });

  describe('email already in use', () => {
    it('fails with EmailAlreadyInUseError when email exists in snapshot', async () => {
      const snapshot = mkSnapshot({
        emailToUserId: new Map([[email, UserId(1)]]),
      });

      const effect = createUserAccount({ displayName, email }, snapshot);
      const exit = await E.runPromiseExit(effect);

      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure') {
        const err = Cause.failureOption(exit.cause);
        expect(O.isSome(err)).toBe(true);
        if (O.isSome(err)) {
          expect(err.value).toMatchObject({
            _tag: 'EmailAlreadyInUseError',
            email,
          });
        }
      }
    });
  });

  describe('display name already in use', () => {
    it('fails with DisplayNameAlreadyInUseError when displayName exists in snapshot', async () => {
      const snapshot = mkSnapshot({
        displayNameToUserId: new Map([[displayName, UserId(1)]]),
      });

      const effect = createUserAccount({ displayName, email }, snapshot);
      const exit = await E.runPromiseExit(effect);

      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure') {
        const err = Cause.failureOption(exit.cause);
        expect(O.isSome(err)).toBe(true);
        if (O.isSome(err)) {
          expect(err.value).toMatchObject({
            _tag: 'DisplayNameAlreadyInUseError',
            displayName,
          });
        }
      }
    });
  });

  describe('both in use', () => {
    it('fails when both email and displayName exist — error type depends on check order (email first)', async () => {
      const snapshot = mkSnapshot({
        emailToUserId: new Map([[email, UserId(1)]]),
        displayNameToUserId: new Map([[displayName, UserId(1)]]),
      });

      const effect = createUserAccount({ displayName, email }, snapshot);
      const exit = await E.runPromiseExit(effect);

      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure') {
        const err = Cause.failureOption(exit.cause);
        expect(O.isSome(err)).toBe(true);
        if (O.isSome(err)) {
          expect(err.value).toMatchObject({ _tag: 'EmailAlreadyInUseError' });
        }
      }
    });
  });
});

// beginning of LLM written Code, Model: GPT-5.5
describe('UserRole', () => {
  it('accepts only the persisted role values', () => {
    expect(UserRole.from('user')).toBe('user');
    expect(UserRole.from('admin')).toBe('admin');
    expect(() => UserRole.from('owner')).toThrow('Invalid user role');
  });
});
// end of LLM written Code
