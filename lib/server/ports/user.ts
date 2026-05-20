import { eq, sql } from 'drizzle-orm';
import type { User } from '@/domain/aggregates/user';
import { InfraError, InfraNotFoundError, PortError, UserNotFoundError } from '@/domain/errors';
import type {
  CreateUserParams,
  UserReadRepo as UserReadRepoDomain,
  UserWriteRepo as UserWriteRepoDomain,
} from '@/domain/ports/user';
import {
  UserDisplayName,
  UserEmail,
  UserId,
  UserPublicId,
  Nonce,
  UserRole,
} from '@/domain/values/user';
// beginning of LLM written Code, Model: gpt-5.3-codex
import { requireValidDate } from '@/domain/values/timestamp';
// end of LLM written Code
import { A, E, Fn } from '@/lib/shared/imports';
import { Db } from '../db';
import { type UserPrs, users } from '../schema';

const errMapper =
  (WrappedError: typeof InfraNotFoundError | typeof InfraError | typeof UserNotFoundError) =>
  (cause: unknown) =>
    new PortError({ cause: new WrappedError({ cause }) });

// beginning of LLM written Code, Model: GPT-5.5
/*
Decision questionnaire
- Where should DB user rows become domain users?
  - [x] Single mapper in the infrastructure port.
  - [ ] Repeated object literals in every repository method.
*/
const mapUserPrsToDomain = (u: UserPrs): User => ({
  id: UserId(u.id),
  publicId: UserPublicId(u.publicId),
  displayName: UserDisplayName(u.displayName),
  email: UserEmail(u.email),
  role: UserRole.from(u.role),
  createdAt: requireValidDate(u.createdAt),
  updatedAt: requireValidDate(u.updatedAt),
  nonce: Nonce(u.nonce),
});
// end of LLM written Code

export const userReadRepo: UserReadRepoDomain<Db> = {
  getUser: (o) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () => {
            let query;

            if ('id' in o) query = eq(users.id, o.id);
            else if ('email' in o) query = eq(users.email, o.email);
            else if ('displayName' in o) query = eq(users.displayName, o.displayName);
            else query = eq(users.publicId, o.publicId);

            return db.select().from(users).where(query).limit(1);
          },
          catch: errMapper(InfraError),
        }),
      ),
      E.flatMap((us) => Fn.pipe(A.head(us), E.mapError(errMapper(UserNotFoundError)))),
      E.map(mapUserPrsToDomain),
    ),
};

export const userWriteRepo: UserWriteRepoDomain<Db> = {
  createUser: (o: CreateUserParams) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db
              .insert(users)
              .values({
                displayName: o.displayName,
                email: o.email,
              })
              .returning(),
          catch: errMapper(InfraError),
        }),
      ),
      E.flatMap((rows) => Fn.pipe(A.head(rows), E.mapError(errMapper(InfraError)))),
      E.map(mapUserPrsToDomain),
    ),

  // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
  incrementNonce: (userId) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db
              .update(users)
              .set({ nonce: sql`${users.nonce} + 1` })
              .where(eq(users.id, userId)),
          catch: errMapper(InfraError),
        }),
      ),
      E.asVoid,
    ),
  // end of LLM written Code
};
