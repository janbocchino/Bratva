// beginning of LLM written Code, Model: gpt-5.3-codex
/*
Decision questionnaire
- What timestamp should persistence use?
  - [x] Unix epoch milliseconds.
  - [ ] Unix epoch seconds.
  - Rationale: aligns with JavaScript Date precision and avoids per-call unit guessing.
- How should legacy values be handled during migration period?
  - [x] Parse legacy-compatible inputs in one shared function.
  - [ ] Fail hard on any non-canonical value.
  - Rationale: keeps old rows readable while writing only canonical values.
*/
const numericStringPattern = /^\d+$/;
const sqliteDateTimePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export const toTimestampMs = (value: number): number =>
  Math.abs(value) < 1_000_000_000_000 ? value * 1000 : value;

export const normalizeTimestamp = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(toTimestampMs(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    if (!Number.isFinite(asNumber)) return null;
    return normalizeTimestamp(asNumber);
  }

  if (typeof value === 'string') {
    const input = value.trim();
    if (input.length === 0) return null;

    if (numericStringPattern.test(input)) {
      const parsed = Number(input);
      return Number.isFinite(parsed) ? normalizeTimestamp(parsed) : null;
    }

    const date = new Date(input);
    if (!Number.isNaN(date.getTime())) return date;

    if (sqliteDateTimePattern.test(input)) {
      const isoLike = `${input.replace(' ', 'T')}Z`;
      const isoDate = new Date(isoLike);
      return Number.isNaN(isoDate.getTime()) ? null : isoDate;
    }
  }

  return null;
};

export const requireValidDate = (value: unknown, fallback = new Date(0)): Date =>
  normalizeTimestamp(value) ?? fallback;
// end of LLM written Code
