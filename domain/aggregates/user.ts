import type {
	UserDisplayName,
	UserEmail,
	UserId,
	UserPublicId,
} from '../values/user';

/** The simplest representation of a user in our domain. */
export type User = {
	id: UserId;
	publicId: UserPublicId;
	displayName: UserDisplayName;
	email: UserEmail;
	createdAt: Date;
	updatedAt: Date;
};
