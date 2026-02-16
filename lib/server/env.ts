import { type } from 'arktype';
import { PublicEnv } from '@/lib/client/env';

/** Schema for server-side environment variables. Cannot be exposed to client.. */
export const ServerEnv = PublicEnv.and(
  type({
    DATABASE_URL: 'string',
  }),
);

/** Type of the server environment variables. */
export type ServerEnv = typeof ServerEnv.infer;

/** Variable of actual parsed environment variables. */
export const serverEnv = ServerEnv.assert(process.env);
