// beginning of LLM written Code, Model: Claude Opus 4.5
/*
Decision questionnaire (user-facing errors)
- Where should user copy live?
  - [x] Single mapper in `map-cause-to-user-message.ts`; this file only runs effects and throws `Error`.
  - [ ] Per-component copy in `app/`.
- How to treat infra / unknown failures?
  - [x] Mapper returns one generic string (no stack traces or DB text).
*/
import type { Effect } from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { E } from '@/lib/shared/imports';
import { mapCauseToUserMessage } from './map-cause-to-user-message';

export async function runServerDomainEffect<A, Err, R>(effect: Effect<A, Err, R>): Promise<A> {
  const exit = await E.runPromiseExit(effect as Effect<A, Err, never>);
  if (Exit.isSuccess(exit)) return exit.value;
  throw new Error(mapCauseToUserMessage(exit.cause));
}
// end of LLM written Code
