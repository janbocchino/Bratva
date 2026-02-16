import { E } from '@/lib/shared/imports';
import type { User } from '../aggregates/user';
import { UserDisplayName, UserEmail, UserId } from '../values/user';
import { EmailAlreadyInUseError, DisplayNameAlreadyInUseError } from '../errors';

export interface DbSnaphot {
  emailToUserId: Map<UserEmail, UserId>;
  displayNameToUserId: Map<UserDisplayName, UserId>;
}

export function createUserAccount(
  p: Pick<User, 'displayName' | 'email'>,
  snapshot: DbSnaphot,
): E.Effect<
  Pick<User, 'displayName' | 'email'>,
  EmailAlreadyInUseError | DisplayNameAlreadyInUseError
> {
  const { displayName, email } = p;

  if (snapshot.emailToUserId.has(email)) {
    return E.fail(new EmailAlreadyInUseError({ email }));
  }

  if (snapshot.displayNameToUserId.has(displayName)) {
    return E.fail(new DisplayNameAlreadyInUseError({ displayName }));
  }

  return E.succeed({
    displayName,
    email,
  });
}
