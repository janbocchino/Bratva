import type { Market } from '../aggregates/market';
import { Cent } from '../values/currencies';

// beginning of LLM written Code, Model: gpt-5.3-codex
export const selectMarketDisplayPrice = (market: Market): Cent => {
  if (market.status === 'closed') return market.modelPrice;

  const reserveBase = BigInt(market.ammPool.reserveBase);
  const reserveQuote = BigInt(market.ammPool.reserveQuote);

  if (reserveBase <= 0n || reserveQuote <= 0n) return market.modelPrice;
  return Cent.new(reserveQuote / reserveBase);
};
// end of LLM written Code
