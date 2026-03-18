// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import { type } from 'arktype';
import type { E } from '@/lib/shared/imports';
import type { Market } from '../aggregates/market';
import type { PortError } from '../errors';
import type { AssetId } from '../values/asset';
import type { Cent } from '../values/currencies';
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

// beginning of LLM written Code, Model: gpt-5.3-codex
export type UpdateMarketModelPriceParams = {
  baseAssetId: AssetId;
  modelPrice: Cent;
};
// end of LLM written Code

export interface MarketWriteRepo<D> {
  updateMarketAfterMatch(o: UpdateMarketParams): E.Effect<void, PortError, D>;
  // beginning of LLM written Code, Model: gpt-5.3-codex
  updateMarketModelPrices(
    rows: readonly UpdateMarketModelPriceParams[],
  ): E.Effect<number, PortError, D>;
  // end of LLM written Code
}
// end of LLM written Code
