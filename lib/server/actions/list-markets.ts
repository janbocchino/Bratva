'use server';

import { QuoteAmount, SCALE } from '@/domain/values/currencies';
import { mulDivDown } from '@/domain/values/fixed-point';
// beginning of LLM written Code, Model: gpt-5.3-codex
/*
Decision questionnaire
- What should Explore display as price by status?
  - [x] `closed` -> latest model price; `pending/active` -> latest `price_series`.
  - [ ] Single price source for all statuses.
*/
// end of LLM written Code
import { E } from '@/lib/shared/imports';
import { Db, db } from '../db';
import { assetReadRepo } from '../ports/asset';
import { marketReadRepo } from '../ports/market';
import { priceSeriesReadRepo } from '../ports/price-series';
import { runServerDomainEffect } from '../run-server-domain-effect';

// beginning of LLM written Code, Model: gpt-5.3-codex-low
export type ExploreMarketRow = {
  id: number;
  publicId: string;
  baseAssetName: string;
  baseAssetTicker: string;
  quoteAssetName: string;
  quoteAssetTicker: string;
  status: 'closed' | 'pending' | 'active';
  wasPreviouslyActive: boolean;
  /** 18-decimal fixed-point quote amount as a decimal string (same encoding as `QuoteAmount`). */
  displayPriceScaled: string;
};

export async function listMarkets(): Promise<readonly ExploreMarketRow[]> {
  const markets = await runServerDomainEffect(
    marketReadRepo.listMarkets().pipe(E.provideService(Db, db)),
  );
  const rows = await Promise.all(
    markets.map(async (market) => {
      const [baseAsset, quoteAsset] = await Promise.all([
        runServerDomainEffect(
          assetReadRepo.getAsset({ id: market.baseAssetId }).pipe(E.provideService(Db, db)),
        ),
        runServerDomainEffect(
          assetReadRepo.getAsset({ id: market.quoteAssetId }).pipe(E.provideService(Db, db)),
        ),
      ]);
      const latestTradePrice = await runServerDomainEffect(
        priceSeriesReadRepo
          .getLatestPriceByAssetId(market.baseAssetId)
          .pipe(E.provideService(Db, db)),
      );

      // beginning of LLM written Code, Model: gpt-5.3-codex
      const displayPrice =
        market.status === 'closed'
          ? market.modelPrice
          : (latestTradePrice?.price ??
            (market.ammPool.reserveBase > 0n && market.ammPool.reserveQuote > 0n
              ? QuoteAmount.new(
                  mulDivDown(
                    BigInt(market.ammPool.reserveQuote),
                    SCALE,
                    BigInt(market.ammPool.reserveBase),
                  ),
                )
              : market.modelPrice));
      // end of LLM written Code

      return {
        id: market.id,
        publicId: market.publicId,
        baseAssetName: baseAsset.name,
        baseAssetTicker: baseAsset.ticker,
        quoteAssetName: quoteAsset.name,
        quoteAssetTicker: quoteAsset.ticker,
        status: market.status,
        wasPreviouslyActive: market.wasPreviouslyActive,
        displayPriceScaled: displayPrice.toString(),
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
    wasPreviouslyActive: market.wasPreviouslyActive,
    displayPriceScaled: market.displayPriceScaled,
  }));
}
// end of LLM written Code
