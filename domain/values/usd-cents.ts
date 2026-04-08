// beginning of LLM written Code, Model: Claude Opus 4.5
/*
Decision questionnaire
- Where do integer USD cents exist?
  - [x] Only at external feed / API boundary; domain storage remains `QuoteAmount` (18 dp).
  - [ ] As a second internal numeric type — would duplicate money representation.
*/
import { Brand } from 'effect';
import { QuoteAmount, SCALE } from './currencies';

/** Whole USD cents from an external source (e.g. `int(price * 100)`), not fixed-point scaled amounts. */
export type UsdCents = Brand.Branded<bigint, 'UsdCents'>;

export const UsdCents = {
  new: Brand.nominal<UsdCents>(),
  /** Non-negative integer cents from a trusted feed row. */
  fromInteger: (cents: number): UsdCents => {
    if (!Number.isInteger(cents) || cents < 0) {
      throw new TypeError(`UsdCents.fromInteger: expected non-negative integer, got ${cents}`);
    }
    return UsdCents.new(BigInt(cents));
  },
};

/** Converts whole cents from a feed into the internal 18-decimal quote scale (1 cent = SCALE/100). */
export const quoteAmountFromUsdCents = (cents: UsdCents): QuoteAmount =>
  QuoteAmount.new(BigInt(cents) * (SCALE / 100n));
// end of LLM written Code
