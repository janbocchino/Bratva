// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import type { Market } from '../aggregates/market';
import { QuoteAmount, SCALE } from '../values/currencies';
import { mulDivDown } from '../values/fixed-point';

export const selectMarketDisplayPrice = (market: Market): QuoteAmount => {
  if (market.status === 'closed') return market.modelPrice;

  const reserveBase = BigInt(market.ammPool.reserveBase);
  const reserveQuote = BigInt(market.ammPool.reserveQuote);

  if (reserveBase <= 0n || reserveQuote <= 0n) return market.modelPrice;
  // Both reserves are SCALE-scaled; spot quote/base needs one SCALE factor kept in the result.
  return QuoteAmount.new(mulDivDown(reserveQuote, SCALE, reserveBase));
};
// end of LLM written Code
