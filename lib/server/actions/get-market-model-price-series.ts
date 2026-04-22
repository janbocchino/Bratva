// beginning of LLM written Code, Model: Claude Opus 4.5
/*
Decision questionnaire
- How to read model price history for charts?
  - [x] Dedicated server action querying append-only `model_price` by `market_id`, ordered by time.
  - [ ] Extend domain port with a new exported chart-only API.
*/
'use server';

import { asc, eq } from 'drizzle-orm';
import { InfraError, PortError } from '@/domain/errors';
import { E, Fn } from '@/lib/shared/imports';
import { Db, db } from '../db';
import { marketReadRepo } from '../ports/market';
import { runServerDomainEffect } from '../run-server-domain-effect';
import { modelPrice } from '../schema';

export type MarketModelPriceSeriesPoint = {
  createdAtIso: string;
  /** 18-decimal fixed-point price as a decimal string (same encoding as `QuoteAmount`). */
  priceScaled: string;
};

const toPortError = (cause: unknown) => new PortError({ cause: new InfraError({ cause }) });

export async function getMarketModelPriceSeries(input: {
  marketPublicId: string;
  limit?: number;
}): Promise<readonly MarketModelPriceSeriesPoint[]> {
  const safeLimit = Math.max(1, Math.min(input.limit ?? 200, 2_000));

  const pipeline = Fn.pipe(
    marketReadRepo.getMarket({ publicId: input.marketPublicId }),
    E.flatMap((market) =>
      E.tryPromise({
        try: async () => {
          const rows = await db
            .select({
              price: modelPrice.price,
              createdAt: modelPrice.createdAt,
            })
            .from(modelPrice)
            .where(eq(modelPrice.marketId, market.id))
            .orderBy(asc(modelPrice.createdAt));
          return rows.slice(-safeLimit);
        },
        catch: toPortError,
      }),
    ),
    E.map((rows) =>
      rows.map(
        (row) =>
          ({
            createdAtIso: row.createdAt.toISOString(),
            priceScaled: row.price.toString(),
          }) satisfies MarketModelPriceSeriesPoint,
      ),
    ),
  );

  return await runServerDomainEffect(pipeline.pipe(E.provideService(Db, db)));
}
// end of LLM written Code
