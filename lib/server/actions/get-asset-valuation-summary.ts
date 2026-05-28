// beginning of LLM written Code, Model: GPT-5.2
'use server';

import { InfraError, PortError } from '@/domain/errors';
import { E, Fn } from '@/lib/shared/imports';
import { Db, db } from '../db';
import { assetReadRepo } from '../ports/asset';
import { valuationSummaryReadRepo } from '../ports/valuation-summary';
import { runServerDomainEffect } from '../run-server-domain-effect';

export type AssetValuationSummary = {
  body: string;
  createdAtIso: string;
  featureSnapshotJson: string;
};

const toPortError = (cause: unknown) => new PortError({ cause: new InfraError({ cause }) });

export async function getAssetValuationSummary(input: {
  baseAssetPublicId: string;
}): Promise<AssetValuationSummary | null> {
  const pipeline = Fn.pipe(
    assetReadRepo.getAsset({ publicId: input.baseAssetPublicId }),
    E.flatMap((asset) => valuationSummaryReadRepo.getLatestByAssetId({ assetId: asset.id })),
    E.map((row) =>
      row === null
        ? null
        : ({
            body: row.body,
            createdAtIso: row.createdAt.toISOString(),
            featureSnapshotJson: row.featureSnapshotJson,
          } satisfies AssetValuationSummary),
    ),
    E.mapError(toPortError),
  );

  return await runServerDomainEffect(pipeline.pipe(E.provideService(Db, db)));
}
// end of LLM written Code
