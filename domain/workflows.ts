import { Data } from 'effect';
import { E, Fn } from '@/lib/shared/imports';
import type { User } from './aggregates/user';
import type { PortError } from './ports/errors';
import { UserNotFoundError } from './ports/errors';
import type { UserReadRepo, UserWriteRepo } from './ports/user';

export class EmailAlreadyInUseError extends Data.TaggedError(
	'EmailAlreadyInUseError',
)<{
	email: string;
}> {}

export class CreateUserAccountValidationError extends Data.TaggedError(
	'CreateUserAccountValidationError',
)<{
	cause: string;
}> {}

export type CreateUserAccountParams = {
	displayName: string;
	email: string;
};

export type CreateUserAccountDeps<D> = {
	userReadRepo: UserReadRepo<D>;
	userWriteRepo: UserWriteRepo<D>;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const validateCreateUserAccount = (
	p: CreateUserAccountParams,
): E.Effect<
	{
		displayName: string;
		email: string;
	},
	CreateUserAccountValidationError
> => {
	const displayName = p.displayName.trim();
	const email = normalizeEmail(p.email);

	if (displayName.length === 0) {
		return E.fail(
			new CreateUserAccountValidationError({ cause: 'displayName is required' }),
		);
	}

	// Minimal validation (keep domain pure and avoid external deps).
	// You can strengthen this later (RFC compliance, disposable domains, etc.).
	if (!email.includes('@') || email.startsWith('@') || email.endsWith('@')) {
		return E.fail(
			new CreateUserAccountValidationError({ cause: 'email is invalid' }),
		);
	}

	return E.succeed({
		displayName,
		email,
	});
};

const isUserNotFoundPortError = (err: PortError) =>
	err.cause instanceof UserNotFoundError;

/**
 * CreateUserAccount
 *
 * Matches the workflow in `domain/workflows.md`:
 * - validate input and normalize email
 * - if email exists -> fail EmailAlreadyInUseError
 * - else persist new user and return it
 */
export const createUserAccount =
	<D>({ userReadRepo, userWriteRepo }: CreateUserAccountDeps<D>) =>
	(params: CreateUserAccountParams): E.Effect<
		User,
		EmailAlreadyInUseError | CreateUserAccountValidationError | PortError,
		D
	> =>
		Fn.pipe(
			validateCreateUserAccount(params),
			E.flatMap(({ displayName, email }) =>
				Fn.pipe(
					userReadRepo.getUser({ email }),
					E.matchEffect({
						onFailure: (err) =>
							isUserNotFoundPortError(err)
								? E.void
								: E.fail(err),
						onSuccess: () => E.fail(new EmailAlreadyInUseError({ email })),
					}),
					E.flatMap(() => userWriteRepo.createUser({ displayName, email })),
				),
			),
		);
