// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import { type } from 'arktype';
import type { E } from '@/lib/shared/imports';
import type { Market } from '../aggregates/market';
import type { PortError } from '../errors';
import type { MarketId } from '../values/market';

// ── Market ───────────────────────────────────────────────────────────

export const GetMarketParams = type({
  id: 'number',
}).or({
  publicId: 'string',
});

export type GetMarketParams = typeof GetMarketParams.infer;

export interface MarketReadRepo<D> {
  getMarket(o: GetMarketParams): E.Effect<Market, PortError, D>;
}

export type UpdateMarketParams = {
  marketId: MarketId;
  sequenceNumber: number;
  ammReserveBase: bigint;
  ammReserveQuote: bigint;
};

export interface MarketWriteRepo<D> {
  updateMarketAfterMatch(o: UpdateMarketParams): E.Effect<void, PortError, D>;
}
// end of LLM written Code
