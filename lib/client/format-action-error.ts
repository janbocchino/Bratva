// beginning of LLM written Code, Model: Claude Opus 4.5
/*
Decision questionnaire
- Duplicate server-side user messages here?
  - [x] No — server actions throw `Error` with mapped text; this only handles non-Error / empty message fallbacks.
*/
export function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}
// end of LLM written Code
