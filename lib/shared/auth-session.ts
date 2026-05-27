// beginning of LLM written Code, Model: GPT-5.5
/*
Decision questionnaire
- Where should session cookie constants live?
  - [x] Shared, dependency-free module usable by proxy and server auth.
  - [ ] Server auth module only, which would pull Node-only code into proxy.
*/
export const SESSION_COOKIE_NAME = 'bratva_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
// end of LLM written Code
