import { Brand } from 'effect';

export type UserId = Brand.Branded<number, 'UserId'>;
export const UserId = Brand.nominal<UserId>();

export type UserPublicId = Brand.Branded<string, 'UserPublicId'>;
export const UserPublicId = Brand.nominal<UserPublicId>();

export type UserEmail = Brand.Branded<string, 'UserEmail'>;
export const UserEmail = Brand.nominal<UserEmail>();

export type UserDisplayName = Brand.Branded<string, 'UserDisplayName'>;
export const UserDisplayName = Brand.nominal<UserDisplayName>();
