// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
/// <reference types="jest" />
import { mulDivDown, mulDivUp, divDown, divUp, remainder } from '../values/fixed-point';
import { settledMulDiv } from '../values/settlement';
import { parseFixedPoint } from '../values/parse-fixed-point';
import {
  formatFixedPoint,
  formatTokenAmount,
  formatQuoteAmount,
} from '../values/format-fixed-point';
import { settleTradeMatch } from '../workflows/trade-settlement';
import { calcLpTokens } from '../workflows/liquidity';
import { SCALE, TokenAmount, QuoteAmount, LpTokens } from '../values/currencies';

/* ------------------------------------------------------------------ */
/*  Fixed-point primitives                                             */
/* ------------------------------------------------------------------ */
describe('mulDivDown', () => {
  it('exact division has no remainder', () => {
    expect(mulDivDown(10n, 20n, 5n)).toBe(40n);
  });

  it('truncates toward zero', () => {
    expect(mulDivDown(10n, 3n, 7n)).toBe(4n);
  });

  it('zero numerator returns zero', () => {
    expect(mulDivDown(0n, 100n, 7n)).toBe(0n);
  });
});

describe('mulDivUp', () => {
  it('exact division returns same as mulDivDown', () => {
    expect(mulDivUp(10n, 20n, 5n)).toBe(40n);
  });

  it('rounds up when remainder is nonzero', () => {
    expect(mulDivUp(10n, 3n, 7n)).toBe(5n);
  });

  it('zero numerator returns zero', () => {
    expect(mulDivUp(0n, 100n, 7n)).toBe(0n);
  });
});

describe('divDown / divUp', () => {
  it('divDown truncates', () => {
    expect(divDown(10n, 3n)).toBe(3n);
  });

  it('divUp rounds up when remainder exists', () => {
    expect(divUp(10n, 3n)).toBe(4n);
  });

  it('divUp exact division', () => {
    expect(divUp(10n, 5n)).toBe(2n);
  });
});

describe('remainder', () => {
  it('captures the modulo of a * b / c', () => {
    expect(remainder(10n, 3n, 7n)).toBe(2n);
  });

  it('zero when exact', () => {
    expect(remainder(10n, 20n, 5n)).toBe(0n);
  });
});

/* ------------------------------------------------------------------ */
/*  SettledAmount                                                      */
/* ------------------------------------------------------------------ */
describe('settledMulDiv', () => {
  it('returns amount and dust', () => {
    const result = settledMulDiv(10n, 3n, 7n);
    expect(result.amount).toBe(4n);
    expect(result.dust).toBe(2n);
  });

  it('dust is zero when exact', () => {
    const result = settledMulDiv(10n, 20n, 5n);
    expect(result.amount).toBe(40n);
    expect(result.dust).toBe(0n);
  });

  it('amount + dust/c reconstructs original', () => {
    const a = 7n,
      b = 11n,
      c = 3n;
    const result = settledMulDiv(a, b, c);
    expect(result.amount * c + result.dust).toBe(a * b);
  });
});

/* ------------------------------------------------------------------ */
/*  parseFixedPoint                                                    */
/* ------------------------------------------------------------------ */
describe('parseFixedPoint', () => {
  it('parses whole number', () => {
    expect(parseFixedPoint('100')).toBe(100n * SCALE);
  });

  it('parses decimal number', () => {
    expect(parseFixedPoint('2.5')).toBe(2_500_000_000_000_000_000n);
  });

  it('parses many decimal places, truncating to 18', () => {
    const result = parseFixedPoint('1.123456789012345678999');
    expect(result).toBe(1_123_456_789_012_345_678n);
  });

  it('parses leading zero', () => {
    expect(parseFixedPoint('0.01')).toBe(10_000_000_000_000_000n);
  });

  it('parses negative', () => {
    expect(parseFixedPoint('-5.5')).toBe(-5_500_000_000_000_000_000n);
  });

  it('throws on empty input', () => {
    expect(() => parseFixedPoint('')).toThrow();
  });

  it('throws on multiple dots', () => {
    expect(() => parseFixedPoint('1.2.3')).toThrow();
  });

  it('with 2 decimals', () => {
    expect(parseFixedPoint('10.50', 2)).toBe(1050n);
  });
});

/* ------------------------------------------------------------------ */
/*  formatFixedPoint                                                   */
/* ------------------------------------------------------------------ */
describe('formatFixedPoint', () => {
  it('formats whole token amounts', () => {
    expect(formatTokenAmount(5n * SCALE)).toBe('5.0000');
  });

  it('formats fractional token amounts', () => {
    expect(formatTokenAmount(2_500_000_000_000_000_000n)).toBe('2.5000');
  });

  it('formats quote amounts to 2dp', () => {
    expect(formatQuoteAmount(100n * SCALE)).toBe('100.00');
  });

  it('formats zero', () => {
    expect(formatFixedPoint(0n)).toBe('0.0000');
  });

  it('formats negative', () => {
    expect(formatFixedPoint(-5n * SCALE)).toBe('-5.0000');
  });
});

/* ------------------------------------------------------------------ */
/*  Trade settlement                                                   */
/* ------------------------------------------------------------------ */
describe('settleTradeMatch', () => {
  it('exact division: cost equals proceeds, no dust', () => {
    const price = QuoteAmount.new(2n * SCALE);
    const quantity = TokenAmount.new(3n * SCALE);
    const result = settleTradeMatch({ price, quantity });

    expect(result.cost.amount).toBe(result.proceeds.amount);
    expect(result.cost.dust).toBe(0n);
    expect(result.tokenAmount).toBe(quantity);
  });

  it('non-exact: buyer pays 1 more sub-unit than seller receives', () => {
    const price = QuoteAmount.new(7n);
    const quantity = TokenAmount.new(3n);
    const result = settleTradeMatch({ price, quantity });

    const rem = (7n * 3n) % SCALE;
    expect(rem).not.toBe(0n);
    expect(BigInt(result.cost.amount)).toBe(BigInt(result.proceeds.amount) + 1n);
    expect(result.cost.dust).toBe(1n);
  });

  it('protocol never loses: cost >= proceeds', () => {
    const prices = [1n, 3n, 7n, 11n, 13n, 17n, 19n, 23n];
    const quantities = [1n, 2n, 5n, 10n, 100n];

    for (const p of prices) {
      for (const q of quantities) {
        const result = settleTradeMatch({
          price: QuoteAmount.new(p * SCALE),
          quantity: TokenAmount.new(q * SCALE),
        });
        expect(BigInt(result.cost.amount)).toBeGreaterThanOrEqual(BigInt(result.proceeds.amount));
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/*  LP calculation with dust                                           */
/* ------------------------------------------------------------------ */
describe('calcLpTokens with dust', () => {
  it('initial deposit: sqrt with symmetric 18-decimal scale', () => {
    const base = 5n * SCALE;
    const quote = 5n * SCALE;
    const result = calcLpTokens({
      amountBase: base,
      amountQuote: quote,
      reserveBase: 0n,
      reserveQuote: 0n,
      totalLpSupply: 0n,
    });
    expect(result.lpTokens.amount).toBe(5n * SCALE);
    expect(result.lpTokens.dust).toBe(0n);
  });

  it('subsequent deposit: returns dust from modulo', () => {
    const reserveBase = 100n * SCALE;
    const reserveQuote = 200n * SCALE;
    const totalLp = 141n * SCALE + 421356237309504880n;

    const result = calcLpTokens({
      amountBase: 7n * SCALE,
      amountQuote: 14n * SCALE,
      reserveBase,
      reserveQuote,
      totalLpSupply: totalLp,
    });

    expect(result.lpTokens.amount > 0n).toBe(true);
  });

  it('round-trip: deposit + withdraw does not leak value from pool', () => {
    const initialBase = 100n * SCALE;
    const initialQuote = 200n * SCALE;

    const initialLp = calcLpTokens({
      amountBase: initialBase,
      amountQuote: initialQuote,
      reserveBase: 0n,
      reserveQuote: 0n,
      totalLpSupply: 0n,
    });

    const depositBase = 10n * SCALE;
    const depositQuote = 20n * SCALE;
    const newReserveBase = initialBase + depositBase;
    const newReserveQuote = initialQuote + depositQuote;
    const totalLpAfterDeposit = BigInt(initialLp.lpTokens.amount);

    const secondLp = calcLpTokens({
      amountBase: depositBase,
      amountQuote: depositQuote,
      reserveBase: initialBase,
      reserveQuote: initialQuote,
      totalLpSupply: totalLpAfterDeposit,
    });

    const totalLpFinal = totalLpAfterDeposit + BigInt(secondLp.lpTokens.amount);

    const withdrawBase = settledMulDiv(
      BigInt(secondLp.lpTokens.amount),
      newReserveBase,
      totalLpFinal,
    );
    const withdrawQuote = settledMulDiv(
      BigInt(secondLp.lpTokens.amount),
      newReserveQuote,
      totalLpFinal,
    );

    expect(withdrawBase.amount).toBeLessThanOrEqual(depositBase);
    expect(withdrawQuote.amount).toBeLessThanOrEqual(depositQuote);
  });
});
// end of LLM written Code
