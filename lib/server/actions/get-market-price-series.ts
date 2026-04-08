// beginning of LLM written Code, Model: gpt-5.2
'use server';

import { E, Fn } from '@/lib/shared/imports';
import { Db, db } from '../db';
import { marketReadRepo } from '../ports/market';
import { priceSeriesReadRepo } from '../ports/price-series';
import { runServerDomainEffect } from '../run-server-domain-effect';

export type MarketPriceSeriesPoint = {
  createdAtIso: string;
  /** 18-decimal fixed-point price as a decimal string (same encoding as `QuoteAmount`). */
  priceScaled: string;
};

export async function getMarketPriceSeries(input: {
  marketPublicId: string;
  limit?: number;
}): Promise<readonly MarketPriceSeriesPoint[]> {
  const safeLimit = Math.max(1, Math.min(input.limit ?? 200, 2_000));

  const pipeline = Fn.pipe(
    marketReadRepo.getMarket({ publicId: input.marketPublicId }),
    E.flatMap((market) => priceSeriesReadRepo.getPriceSeriesByAssetId(market.baseAssetId)),
    E.map((rows) => rows.slice(-safeLimit)),
    E.map((rows) =>
      rows.map(
        (row) =>
          ({
            createdAtIso: row.createdAt.toISOString(),
            priceScaled: row.price.toString(),
          }) satisfies MarketPriceSeriesPoint,
      ),
    ),
  );

  return await runServerDomainEffect(pipeline.pipe(E.provideService(Db, db)));
}
// end of LLM written Code
