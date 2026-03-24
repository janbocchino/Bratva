// beginning of LLM written Code, Model: gpt-5.3-codex
/*
Decision questionnaire
- Which layer owns account history orchestration?
  - [x] Port contract in domain; implementation in server infra.
  - [ ] UI composes multiple sources directly.
*/
import type { E } from '@/lib/shared/imports';
import type { AccountHistory } from '../aggregates/account-history';
import type { PortError } from '../errors';
import type { UserId } from '../values/user';

export interface AccountHistoryReadRepo<D> {
  getHistoryByUserId(userId: UserId): E.Effect<AccountHistory, PortError, D>;
}
// end of LLM written Code
