// beginning of LLM written Code, Model: Claude Opus 4.5
/// <reference types="jest" />
import { SCALE } from '../values/currencies';
import { UsdCents, quoteAmountFromUsdCents } from '../values/usd-cents';

describe('UsdCents', () => {
  it('rejects non-integers', () => {
    expect(() => UsdCents.fromInteger(1.5)).toThrow();
  });

  it('converts cents to scaled quote', () => {
    const q = quoteAmountFromUsdCents(UsdCents.fromInteger(100));
    expect(q).toBe(1n * SCALE);
  });
});
// end of LLM written Code
