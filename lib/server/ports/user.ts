import { eq, or } from 'drizzle-orm';
import type { User } from '@/domain/aggregates/user';
import {
	InfraError,
	InfraNotFoundError,
	PortError,
	UserNotFoundError,
} from '@/domain/ports/errors';
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
} from '@/domain/values/user';
import { A, E, Fn } from '@/lib/shared/imports';
import { Db } from '../db';
import { users } from '../schema';

const errMapper =
	(
		WrappedError:
			| typeof InfraNotFoundError
			| typeof InfraError
			| typeof UserNotFoundError,
	) =>
	(cause: unknown) =>
		new PortError({ cause: new WrappedError({ cause }) });

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
						else query = eq(users.publicId, o.publicId);

						return db.select().from(users).where(query).limit(1);
					},
					catch: errMapper(InfraError),
				}),
			),
			E.flatMap((us) =>
				Fn.pipe(A.head(us), E.mapError(errMapper(UserNotFoundError))),
			),
			E.map(
				(u): User => ({
					id: UserId(u.id),
					publicId: UserPublicId(u.publicId),
					displayName: UserDisplayName(u.displayName),
					email: UserEmail(u.email),
					createdAt: new Date(u.createdAt),
					updatedAt: new Date(u.updatedAt),
				}),
			),
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
			E.flatMap((rows) =>
				Fn.pipe(
					A.head(rows),
					E.mapError(errMapper(InfraError)),
				),
			),
			E.map(
				(u): User => ({
					id: UserId(u.id),
					publicId: UserPublicId(u.publicId),
					displayName: UserDisplayName(u.displayName),
					email: UserEmail(u.email),
					createdAt: new Date(u.createdAt),
					updatedAt: new Date(u.updatedAt),
				}),
			),
		),
};
