// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
/*
Decision questionnaire
- How to value token holdings without assetId on ExploreMarketRow?
  - [x] Map ledger assetId → market via trade/liquidity history entries, then price × qty.
  - [ ] New server action for portfolio (out of scope).
*/

import { SCALE } from '@/domain/values/currencies';
import { mulDivDown } from '@/domain/values/fixed-point';
import type { AccountSnapshot } from '@/lib/server/actions/get-account';
import type { ExploreMarketRow } from '@/lib/server/actions/list-markets';

export type PortfolioHolding = {
  assetId: number;
  balanceScaled: bigint;
  units: 'scaled_unit' | 'cent' | 'unit';
  isUsd: boolean;
  market: ExploreMarketRow | null;
  valueUsdScaled: bigint | null;
};

export type PortfolioSummary = {
  totalUsdScaled: bigint;
  cashUsdScaled: bigint;
  holdings: readonly PortfolioHolding[];
};

const asBigInt = (v: bigint | string): bigint => (typeof v === 'bigint' ? v : BigInt(v));

const buildAssetIdToMarket = (
  snapshot: AccountSnapshot,
  markets: readonly ExploreMarketRow[],
): Map<number, ExploreMarketRow> => {
  const byPublicId = new Map(markets.map((m) => [m.publicId, m]));
  const map = new Map<number, ExploreMarketRow>();

  for (const entry of snapshot.history.entries) {
    if (entry.category === 'trade' || entry.category === 'liquidityProvided') {
      const market = byPublicId.get(entry.marketPublicId);
      if (market !== undefined) {
        map.set(Number(entry.baseAssetId), market);
      }
    }
  }
  return map;
};

export const buildPortfolioSummary = (
  snapshot: AccountSnapshot,
  markets: readonly ExploreMarketRow[],
): PortfolioSummary => {
  const assetIdToMarket = buildAssetIdToMarket(snapshot, markets);
  let totalUsdScaled = 0n;
  let cashUsdScaled = 0n;
  const holdings: PortfolioHolding[] = [];

  for (const row of snapshot.ledger.summary) {
    const balanceScaled = asBigInt(row.balance as bigint | string);
    if (balanceScaled === 0n) continue;

    const isUsd =
      snapshot.usdAssetId !== null && Number(row.assetId) === Number(snapshot.usdAssetId);

    if (isUsd || row.units === 'cent') {
      cashUsdScaled += balanceScaled;
      totalUsdScaled += balanceScaled;
      holdings.push({
        assetId: Number(row.assetId),
        balanceScaled,
        units: row.units,
        isUsd: true,
        market: null,
        valueUsdScaled: balanceScaled,
      });
      continue;
    }

    const market = assetIdToMarket.get(Number(row.assetId)) ?? null;
    let valueUsdScaled: bigint | null = null;
    if (market !== null) {
      valueUsdScaled = mulDivDown(balanceScaled, BigInt(market.displayPriceScaled), SCALE);
      totalUsdScaled += valueUsdScaled;
    }

    holdings.push({
      assetId: Number(row.assetId),
      balanceScaled,
      units: row.units,
      isUsd: false,
      market,
      valueUsdScaled,
    });
  }

  return { totalUsdScaled, cashUsdScaled, holdings };
};
// end of LLM written Code
