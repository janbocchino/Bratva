// beginning of LLM written Code, Model: GPT-5.5
/*
Decision questionnaire
- Where should authorization be enforced?
  - [x] Server-only helpers that load the user from the session and DB.
  - [ ] Client-side role checks or middleware-only checks.
*/
import 'server-only';

import type { User } from '@/domain/aggregates/user';
import {
  AuthenticationRequiredError,
  ForbiddenError,
  InvalidSessionError,
  type PortError,
} from '@/domain/errors';
import type { UserId } from '@/domain/values/user';
import { E, Fn } from '@/lib/shared/imports';
import { Db, db } from '../db';
import { userReadRepo } from '../ports/user';
import { runServerDomainEffect } from '../run-server-domain-effect';
import { readSessionUserId } from './session';

const readUserIdFromSession: E.Effect<UserId | null, InvalidSessionError, never> = E.tryPromise({
  try: readSessionUserId,
  catch: (cause) =>
    cause instanceof InvalidSessionError
      ? cause
      : new InvalidSessionError({
          cause: cause instanceof Error ? cause.message : 'Invalid session',
        }),
});

export const requireUser = (): E.Effect<
  User,
  AuthenticationRequiredError | InvalidSessionError | PortError,
  Db
> =>
  Fn.pipe(
    readUserIdFromSession,
    E.flatMap(
      (userId): E.Effect<User, AuthenticationRequiredError | PortError, Db> =>
        userId === null
          ? E.fail(new AuthenticationRequiredError({ cause: 'Missing session' }))
          : userReadRepo.getUser({ id: userId }),
    ),
  ) as E.Effect<User, AuthenticationRequiredError | InvalidSessionError | PortError, Db>;

export const requireAdmin = (): E.Effect<
  User,
  AuthenticationRequiredError | ForbiddenError | InvalidSessionError | PortError,
  Db
> =>
  Fn.pipe(
    requireUser(),
    E.flatMap((user) =>
      user.role === 'admin'
        ? E.succeed(user)
        : E.fail(new ForbiddenError({ requiredRole: 'admin' })),
    ),
  ) as E.Effect<
    User,
    AuthenticationRequiredError | ForbiddenError | InvalidSessionError | PortError,
    Db
  >;

export async function getRequiredUser(): Promise<User> {
  return await runServerDomainEffect(requireUser().pipe(E.provideService(Db, db)));
}

export async function getRequiredAdmin(): Promise<User> {
  return await runServerDomainEffect(requireAdmin().pipe(E.provideService(Db, db)));
}
// end of LLM written Code
