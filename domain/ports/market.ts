// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
/*
Decision questionnaire
- Should model price writes mutate `markets` or append to dedicated history?
  - [x] Append to dedicated history (`model_price`) and read latest on demand.
  - [ ] Mutate `markets.model_price`.
*/
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
  // beginning of LLM written Code, Model: gpt-5.3-codex-low
  getMarket(o: GetMarketParams): E.Effect<Market, PortError, D>;
  listMarkets(): E.Effect<readonly Market[], PortError, D>;
  getLatestModelPriceByMarketId(marketId: MarketId): E.Effect<Cent | null, PortError, D>;
  // end of LLM written Code
}

export type UpdateMarketParams = {
  marketId: MarketId;
  sequenceNumber: number;
  ammReserveBase: bigint;
  ammReserveQuote: bigint;
};

// beginning of LLM written Code, Model: gpt-5.3-codex
export type InsertModelPriceParams = {
  baseAssetId: AssetId;
  price: Cent;
  createdAt: Date;
};
// end of LLM written Code

export interface MarketWriteRepo<D> {
  updateMarketAfterMatch(o: UpdateMarketParams): E.Effect<void, PortError, D>;
  // beginning of LLM written Code, Model: gpt-5.3-codex
  insertModelPrices(
    rows: readonly InsertModelPriceParams[],
  ): E.Effect<number, PortError, D>;
  // end of LLM written Code
}
// end of LLM written Code
