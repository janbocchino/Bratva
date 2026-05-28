// beginning of LLM written Code, Model: GPT-5.5
import { and, eq } from 'drizzle-orm';
import { InfraError, InfraNotFoundError, PortError } from '@/domain/errors';
import { E, Fn } from '@/lib/shared/imports';
import { Db } from '../db';
import { ASSET_DATA_FIELDS, type AssetDataField, assetsData } from '../schema';

const errMapper =
  (WrappedError: typeof InfraNotFoundError | typeof InfraError) => (cause: unknown) =>
    new PortError({ cause: new WrappedError({ cause }) });

export type AssetDataValue = string | number | string[];

export const assetsDataWriteRepo = {
  insertAssetDataField: (o: { assetId: number; field: AssetDataField; value: AssetDataValue }) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: () =>
            db.insert(assetsData).values({
              assetId: o.assetId,
              field: o.field,
              value: JSON.stringify(o.value),
              createdAt: new Date(),
            }),
          catch: errMapper(InfraError),
        }),
      ),
      E.asVoid,
    ),

  insertMissingInitialAssetDataFields: (o: {
    assetId: number;
    fields: Partial<Record<AssetDataField, AssetDataValue>>;
  }) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: async () => {
            let inserted = 0;
            for (const field of ASSET_DATA_FIELDS) {
              const value = o.fields[field];
              if (value === undefined) continue;

              const existing = await db
                .select({ id: assetsData.id })
                .from(assetsData)
                .where(and(eq(assetsData.assetId, o.assetId), eq(assetsData.field, field)))
                .limit(1);
              if (existing.length > 0) continue;

              await db.insert(assetsData).values({
                assetId: o.assetId,
                field,
                value: JSON.stringify(value),
                createdAt: new Date(),
              });
              inserted += 1;
            }
            return inserted;
          },
          catch: errMapper(InfraError),
        }),
      ),
    ),
};

export const extractAssetDataFields = (
  source: Record<string, unknown>,
): Partial<Record<AssetDataField, AssetDataValue>> => {
  const fields: Partial<Record<AssetDataField, AssetDataValue>> = {};
  for (const field of ASSET_DATA_FIELDS) {
    const value = source[field];
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      (Array.isArray(value) && value.every((item) => typeof item === 'string'))
    ) {
      fields[field] = value;
    }
  }
  return fields;
};

export const assetsDataReadRepo = {
  getLatestSnapshotByAssetId: (o: { assetId: number }) =>
    Fn.pipe(
      E.serviceOptional(Db),
      E.mapError(errMapper(InfraNotFoundError)),
      E.flatMap((db) =>
        E.tryPromise({
          try: async () => {
            // Append-only table; take latest value per field.
            const rows = await db
              .select({
                field: assetsData.field,
                value: assetsData.value,
                createdAt: assetsData.createdAt,
              })
              .from(assetsData)
              .where(eq(assetsData.assetId, o.assetId))
              .orderBy(assetsData.createdAt);

            const latest: Partial<Record<AssetDataField, AssetDataValue>> = {};
            for (const row of rows) {
              latest[row.field] = JSON.parse(row.value) as AssetDataValue;
            }
            return latest;
          },
          catch: errMapper(InfraError),
        }),
      ),
    ),
};
// end of LLM written Code
