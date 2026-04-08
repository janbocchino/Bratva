// beginning of LLM written Code, Model: Claude Opus 4.5
/*
Decision questionnaire
- Where does USD presentation live?
  - [x] `lib/client` — used by client components; imports pure domain formatters only.
  - [ ] Duplicate formatting in domain — would split currency symbol from numeric policy.
- How to combine grouping with formatQuoteAmount?
  - [x] formatQuoteAmount first, then regex-group the whole part before the decimal.
  - [ ] Custom single pass — duplicates SCALE/frac logic.
*/

import { SCALE } from '@/domain/values/currencies';
import { formatQuoteAmount } from '@/domain/values/format-fixed-point';

const groupWholeDigits = (wholeDigits: string): string =>
  wholeDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const formatUsdFromScaledQuote = (value: bigint | string, displayDecimals = 2): string => {
  const raw = typeof value === 'string' ? BigInt(value) : value;
  const formatted = formatQuoteAmount(raw, displayDecimals);
  const negative = formatted.startsWith('-');
  const unsigned = negative ? formatted.slice(1) : formatted;
  const dot = unsigned.indexOf('.');
  const whole = dot === -1 ? unsigned : unsigned.slice(0, dot);
  const frac = dot === -1 ? undefined : unsigned.slice(dot + 1);
  const groupedWhole = groupWholeDigits(whole);
  const body = frac !== undefined && displayDecimals > 0 ? `${groupedWhole}.${frac}` : groupedWhole;
  return negative ? `-$${body}` : `$${body}`;
};

/**
 * Lossy conversion of a scaled quote to IEEE double for pixel layout (charts only).
 * Do not use for settlement or persisted values.
 */
export const scaledQuoteToApproximateNumberForChart = (value: bigint | string): number => {
  const raw = typeof value === 'string' ? BigInt(value) : value;
  return parseFloat(formatQuoteAmount(raw, 18));
};

/** String form of 1.0 in scaled quote space (useful for default placeholders). */
export const ONE_QUOTE_SCALED_STRING = SCALE.toString();
// end of LLM written Code
