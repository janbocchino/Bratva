'use server';

// beginning of LLM written Code, Model: Composer
import { E, Fn } from '@/lib/shared/imports';
import type { User } from '@/domain/aggregates/user';
import type { UserEmail } from '@/domain/values/user';
import { type } from 'arktype';
import { Db, db } from '../db';
import { setSessionUser } from '../auth/session';
import { userReadRepo } from '../ports/user';
import { runServerDomainEffect } from '../run-server-domain-effect';

const parseEmail = type('string.trim |> string.lower |> string.email');

export async function signIn(p: { email: UserEmail }): Promise<User> {
  const email = E.try({
    try: () => parseEmail.assert(p.email),
    catch: () => new Error('Invalid email'),
  });

  const user = Fn.pipe(
    email,
    E.flatMap((email) => userReadRepo.getUser({ email })),
  );

  const signedInUser = await runServerDomainEffect(user.pipe(E.provideService(Db, db)));
  await setSessionUser(signedInUser.id);
  return signedInUser;
}
// end of LLM written Code
