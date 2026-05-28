// beginning of LLM written Code, Model: GPT-5.2
import { desc, eq } from 'drizzle-orm';
import { InfraError, InfraNotFoundError, PortError } from '@/domain/errors';
import { E, Fn } from '@/lib/shared/imports';
import { Db } from '../db';
import { valuationSummaries } from '../schema';

const errMapper =
  (WrappedError: typeof InfraNotFoundError | typeof InfraError) => (cause: unknown) =>
    new PortError({ cause: new WrappedError({ cause }) });

export type ValuationSummaryRow = {
  body: string;
  featureSnapshotJson: string;
  createdAt: Date;
};

export const valuationSummaryReadRepo = {
  getLatestByAssetId: (o: { assetId: number }) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: async () => {
            const rows = await db
              .select({
                body: valuationSummaries.body,
                featureSnapshotJson: valuationSummaries.featureSnapshotJson,
                createdAt: valuationSummaries.createdAt,
              })
              .from(valuationSummaries)
              .where(eq(valuationSummaries.assetId, o.assetId))
              .orderBy(desc(valuationSummaries.createdAt))
              .limit(1);
            return rows[0] ?? null;
          },
          catch: errMapper(InfraError),
        }),
      ),
    ),
};
// end of LLM written Code
