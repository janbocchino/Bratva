import type {
  UserDisplayName,
  UserEmail,
  UserId,
  UserPublicId,
  Nonce,
  UserRole,
} from '../values/user';

// beginning of LLM written Code, Model: GPT-5.5
/*
Decision questionnaire
- Where should authorization role travel?
  - [x] On the core User aggregate loaded from the DB.
  - [ ] Only inside frontend/session DTOs.
*/
// end of LLM written Code

/** The simplest representation of a user in our domain. */
export type User = {
  id: UserId;
  publicId: UserPublicId;
  displayName: UserDisplayName;
  email: UserEmail;
  // beginning of LLM written Code, Model: GPT-5.5
  role: UserRole;
  // end of LLM written Code
  createdAt: Date;
  updatedAt: Date;
  nonce: Nonce;
};
