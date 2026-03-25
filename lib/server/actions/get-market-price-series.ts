// beginning of LLM written Code, Model: gpt-5.2
'use server';

import { E, Fn } from '@/lib/shared/imports';
import { Db, db } from '../db';
import { marketReadRepo } from '../ports/market';
import { priceSeriesReadRepo } from '../ports/price-series';

export type MarketPriceSeriesPoint = {
  createdAtIso: string;
  priceCents: string;
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
            priceCents: row.price.toString(),
          }) satisfies MarketPriceSeriesPoint,
      ),
    ),
  );

  return await pipeline.pipe(E.provideService(Db, db), E.runPromise);
}
// end of LLM written Code

