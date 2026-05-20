'use server';

import { E, Fn } from '@/lib/shared/imports';
import type { User } from '@/domain/aggregates/user';
import { createUserAccount } from '@/domain/workflows/user';
import { type } from 'arktype';
import { Db, db } from '../db';
import { setSessionUser } from '../auth/session';
import { userReadRepo, userWriteRepo } from '../ports/user';
import { runServerDomainEffect } from '../run-server-domain-effect';
import { UserDisplayName, UserEmail, UserId } from '@/domain/values/user';

const parseEmail = type('string.trim |> string.lower |> string.email');
const parseDisplayName = type('string.lower |> string.trim');

export async function createUser(p: Pick<User, 'displayName' | 'email'>): Promise<User> {
  const email = E.try({
    try: () => parseEmail.assert(p.email),
    catch: (error) => new Error('Invalid email'),
  });

  const displayName = E.try({
    try: () => parseDisplayName.assert(p.displayName),
    catch: (error) => new Error('Invalid displayName'),
  });

  const emailToUserId = Fn.pipe(
    email,
    E.flatMap((email) => userReadRepo.getUser({ email })),
    E.map((user) => new Map([[user.email, user.id]])),
    E.catch('name', {
      failure: 'PortError',
      onFailure: (err) => {
        const cause = (err as { cause?: { name?: string; _tag?: string } }).cause;
        if (cause?.name === 'UserNotFoundError' || cause?._tag === 'UserNotFoundError') {
          return E.succeed(new Map() satisfies Map<UserEmail, UserId>);
        }
        return E.fail(err);
      },
    }),
  );
  const displayNameToUserId = Fn.pipe(
    displayName,
    E.flatMap((displayName) => userReadRepo.getUser({ displayName })),
    E.map((user) => new Map([[user.displayName, user.id]])),
    E.catch('name', {
      failure: 'PortError',
      onFailure: (err) => {
        const cause = (err as { cause?: { name?: string; _tag?: string } }).cause;
        if (cause?.name === 'UserNotFoundError' || cause?._tag === 'UserNotFoundError') {
          return E.succeed(new Map() satisfies Map<UserDisplayName, UserId>);
        }
        return E.fail(err);
      },
    }),
  );

  const snapshot = E.all({
    emailToUserId,
    displayNameToUserId,
  });

  const user = Fn.pipe(
    snapshot,
    E.flatMap((snapshot) => createUserAccount(p, snapshot)),
    E.flatMap(userWriteRepo.createUser),
  );

  // beginning of LLM written Code, Model: GPT-5.5
  const createdUser = await runServerDomainEffect(user.pipe(E.provideService(Db, db)));
  await setSessionUser(createdUser.id);
  return createdUser;
  // end of LLM written Code
}
