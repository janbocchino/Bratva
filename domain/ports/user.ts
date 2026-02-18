import { type } from 'arktype';
import type { E } from '@/lib/shared/imports';
import type { User } from '../aggregates/user';
import type { PortError } from '../errors';
import type { UserId } from '../values/user';

export const GetUserParams = type({
  id: 'number',
})
  .or({
    displayName: 'string.lower |> string.trim',
  })
  .or({
    email: 'string',
  })
  .or({
    publicId: 'string',
  });
export type GetUserParams = typeof GetUserParams.infer;

export interface UserReadRepo<D> {
  getUser(o: GetUserParams): E.Effect<User, PortError, D>;
}

export const CreateUserParams = type({
  displayName: 'string.lower |> string.trim',
  email: 'string.trim |> string.lower |> string.email',
});

export type CreateUserParams = typeof CreateUserParams.infer;

export interface UserWriteRepo<D> {
  createUser(o: CreateUserParams): E.Effect<User, PortError, D>;
  // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
  incrementNonce(userId: UserId): E.Effect<void, PortError, D>;
  // end of LLM written Code
}
