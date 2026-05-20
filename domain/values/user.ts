import { Brand } from 'effect';

// beginning of LLM written Code, Model: GPT-5.5
/*
Decision questionnaire
- How should roles be represented?
  - [x] Closed literal union with one parser at the boundary.
  - [ ] Free-form string role names.
*/
export const USER_ROLES = ['user', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const UserRole = {
  user: 'user' as UserRole,
  admin: 'admin' as UserRole,
  from(value: string): UserRole {
    if (value === 'user' || value === 'admin') return value;
    throw new Error(`Invalid user role: ${value}`);
  },
};
// end of LLM written Code

export type UserId = Brand.Branded<number, 'UserId'>;
export const UserId = Brand.nominal<UserId>();

export type UserPublicId = Brand.Branded<string, 'UserPublicId'>;
export const UserPublicId = Brand.nominal<UserPublicId>();

export type UserEmail = Brand.Branded<string, 'UserEmail'>;
export const UserEmail = Brand.nominal<UserEmail>();

export type UserDisplayName = Brand.Branded<string, 'UserDisplayName'>;
export const UserDisplayName = Brand.nominal<UserDisplayName>();

export type Nonce = Brand.Branded<number, 'Nonce'>;
export const Nonce = Brand.nominal<Nonce>();
