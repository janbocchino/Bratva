'use server';

// beginning of LLM written Code, Model: gpt-5.3-codex
/*
Decision questionnaire
- What should Explore display as price by status?
  - [x] `closed` -> latest model price; `pending/active` -> latest `price_series`.
  - [ ] Single price source for all statuses.
*/
// end of LLM written Code
import { E } from '@/lib/shared/imports';
import { Cent } from '@/domain/values/currencies';
import { Db, db } from '../db';
import { assetReadRepo } from '../ports/asset';
import { marketReadRepo } from '../ports/market';
import { priceSeriesReadRepo } from '../ports/price-series';

// beginning of LLM written Code, Model: gpt-5.3-codex-low
export type ExploreMarketRow = {
  id: number;
  publicId: string;
  baseAssetName: string;
  baseAssetTicker: string;
  quoteAssetName: string;
  quoteAssetTicker: string;
  status: 'closed' | 'pending' | 'active';
  displayPriceCents: string;
};

export async function listMarkets(): Promise<readonly ExploreMarketRow[]> {
  const markets = await marketReadRepo.listMarkets().pipe(E.provideService(Db, db), E.runPromise);
  const rows = await Promise.all(
    markets.map(async (market) => {
      const [baseAsset, quoteAsset] = await Promise.all([
        assetReadRepo.getAsset({ id: market.baseAssetId }).pipe(E.provideService(Db, db), E.runPromise),
        assetReadRepo.getAsset({ id: market.quoteAssetId }).pipe(E.provideService(Db, db), E.runPromise),
      ]);
      const latestTradePrice = await priceSeriesReadRepo
        .getLatestPriceByAssetId(market.baseAssetId)
        .pipe(E.provideService(Db, db), E.runPromise);

      // beginning of LLM written Code, Model: gpt-5.3-codex
      const displayPrice =
        market.status === 'closed'
          ? market.modelPrice
          : latestTradePrice?.price ??
            (market.ammPool.reserveBase > 0n && market.ammPool.reserveQuote > 0n
              ? Cent.new(market.ammPool.reserveQuote / market.ammPool.reserveBase)
              : market.modelPrice);
      // end of LLM written Code

      return {
        id: market.id,
        publicId: market.publicId,
        baseAssetName: baseAsset.name,
        baseAssetTicker: baseAsset.ticker,
        quoteAssetName: quoteAsset.name,
        quoteAssetTicker: quoteAsset.ticker,
        status: market.status,
        displayPriceCents: displayPrice.toString(),
      };
    }),
  );

  return rows.map((market) => ({
    id: market.id,
    publicId: market.publicId,
    baseAssetName: market.baseAssetName,
    baseAssetTicker: market.baseAssetTicker,
    quoteAssetName: market.quoteAssetName,
    quoteAssetTicker: market.quoteAssetTicker,
    status: market.status,
    displayPriceCents: market.displayPriceCents,
  }));
}
// end of LLM written Code
