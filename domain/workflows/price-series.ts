// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
/*
Decision questionnaire
- How should USD compatibility be enforced in V1?
  - [x] Explicitly require `market.quoteAssetId === usdAssetId`.
  - [ ] Attempt cross-asset conversion without a dedicated source.
- How should historical points be emitted?
  - [x] One `price_series` point per executed fill transaction.
  - [ ] Collapse to one point per order.
*/
import type { Market } from '@/domain/aggregates/market';
import type { CreateTransactionParams } from '@/domain/ports/exchange';
import type { CreatePriceSeriesBatchParams } from '@/domain/ports/price-series';
import type { AssetId } from '@/domain/values/asset';

export const mapTransactionsToUsdPriceSeriesPoints = (input: {
  market: Market;
  usdAssetId: AssetId;
  transactions: readonly CreateTransactionParams[];
  executedAt: Date;
}): CreatePriceSeriesBatchParams => {
  if (input.market.quoteAssetId !== input.usdAssetId) {
    return [];
  }

  const baseTimeMs = input.executedAt.getTime();

  return input.transactions.map((transaction, index) => ({
    assetId: input.market.baseAssetId,
    price: transaction.price,
    createdAt: new Date(baseTimeMs + index),
  }));
};
// end of LLM written Code
