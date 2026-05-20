import { type } from 'arktype';
import { PublicEnv } from '@/lib/client/env';

/** Schema for server-side environment variables. Cannot be exposed to client.. */
export const ServerEnv = PublicEnv.and(
  // beginning of LLM written Code, Model: gpt-5.3-codex-low
  type({
    DATABASE_URL: 'string',
    // beginning of LLM written Code, Model: GPT-5.5
    AUTH_SESSION_SECRET: 'string?',
    // end of LLM written Code
    FASTAPI_MODEL_PRICE_SOURCE_URL: 'string?',
    FASTAPI_MODEL_PRICE_SOURCE_TOKEN: 'string?',
  }),
  // end of LLM written Code
);

/** Type of the server environment variables. */
export type ServerEnv = typeof ServerEnv.infer;

/** Variable of actual parsed environment variables. */
export const serverEnv = ServerEnv.assert(process.env);
