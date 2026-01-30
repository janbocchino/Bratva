import { E } from '@/lib/shared/imports';;
import { type } from 'arktype';
import { User } from '../aggregates/user';
import { PortError } from './errors';

export const GetUserParams = type({
  id: 'number',
}).or({
  email: 'string',
}).or({
  publicId: 'string',
});
export type GetUserParams = typeof GetUserParams.infer;

export interface UserReadRepo<D> {
  getUser(o: GetUserParams): E.Effect<User, PortError, D>;
}