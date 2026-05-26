import { eq } from 'drizzle-orm';
import type { Asset } from '@/domain/aggregates/asset';
import { AssetNotFoundError, InfraError, InfraNotFoundError, PortError } from '@/domain/errors';
import type {
  AssetReadRepo as AssetReadRepoDomain,
  AssetWriteRepo as AssetWriteRepoDomain,
  CreateAssetParams,
} from '@/domain/ports/asset';
import { AssetId, AssetName, AssetPublicId, AssetTicker } from '@/domain/values/asset';
// beginning of LLM written Code, Model: gpt-5.3-codex
import { requireValidDate } from '@/domain/values/timestamp';
// end of LLM written Code
import { A, E, Fn } from '@/lib/shared/imports';
import { Db } from '../db';
import { assets } from '../schema';

const errMapper =
  (WrappedError: typeof InfraNotFoundError | typeof InfraError | typeof AssetNotFoundError) =>
  (cause: unknown) =>
    new PortError({ cause: new WrappedError({ cause }) });

export const assetReadRepo: AssetReadRepoDomain<Db> = {
  getAsset: (o) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () => {
            let query;

            if ('id' in o) query = eq(assets.id, o.id);
            else if ('publicId' in o) query = eq(assets.publicId, o.publicId);
            else query = eq(assets.ticker, o.ticker);

            return db.select().from(assets).where(query).limit(1);
          },
          catch: errMapper(InfraError),
        }),
      ),
      E.flatMap((rows) => Fn.pipe(A.head(rows), E.mapError(errMapper(AssetNotFoundError)))),
      E.map(
        (row): Asset => ({
          id: AssetId(row.id),
          publicId: AssetPublicId(row.publicId),
          name: AssetName(row.name),
          ticker: AssetTicker(row.ticker),
          // beginning of LLM written Code, Model: gpt-5.3-codex
          createdAt: requireValidDate(row.createdAt),
          updatedAt: requireValidDate(row.updatedAt),
          // end of LLM written Code
        }),
      ),
    ),
};

export const assetWriteRepo: AssetWriteRepoDomain<Db> = {
  createAsset: (o: CreateAssetParams) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db
              .insert(assets)
              .values({
                name: o.name,
                ticker: o.ticker,
                // beginning of LLM written Code, Model: GPT-5.5
                kind: o.kind ?? 'token',
                // end of LLM written Code
              })
              .returning(),
          catch: errMapper(InfraError),
        }),
      ),
      E.flatMap((rows) => Fn.pipe(A.head(rows), E.mapError(errMapper(InfraError)))),
      E.map(
        (row): Asset => ({
          id: AssetId(row.id),
          publicId: AssetPublicId(row.publicId),
          name: AssetName(row.name),
          ticker: AssetTicker(row.ticker),
          // beginning of LLM written Code, Model: gpt-5.3-codex
          createdAt: requireValidDate(row.createdAt),
          updatedAt: requireValidDate(row.updatedAt),
          // end of LLM written Code
        }),
      ),
    ),
};
