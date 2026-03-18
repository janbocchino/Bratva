// beginning of LLM written Code, Model: gpt-5.3-codex
'use server';

import { type } from 'arktype';
import { AssetId } from '@/domain/values/asset';
import { Cent } from '@/domain/values/currencies';
import { Db, db } from '../db';
import { assetReadRepo } from '../ports/asset';
import { marketWriteRepo } from '../ports/market';
import { E, Fn } from '@/lib/shared/imports';
import type { UpdateMarketModelPriceParams } from '@/domain/ports/market';

const ModelPriceInputRow = type({
  assetTicker: 'string.trim |> string.lower',
  priceCents: 'number.integer >= 0',
  timestamp: 'number',
});
const ModelPriceInputBatch = ModelPriceInputRow.array();

type ModelPriceInputRow = typeof ModelPriceInputRow.infer;

const toLatestRowByTicker = (rows: readonly ModelPriceInputRow[]) => {
  const latestByTicker = new Map<string, ModelPriceInputRow>();
  for (const row of rows) {
    const previous = latestByTicker.get(row.assetTicker);
    if (previous === undefined || row.timestamp >= previous.timestamp) {
      latestByTicker.set(row.assetTicker, row);
    }
  }
  return latestByTicker;
};

const resolveAssetIdByTicker = async (ticker: string): Promise<number> =>
  await Fn.pipe(assetReadRepo.getAsset({ ticker }), E.provideService(Db, db), E.runPromise).then(
    (asset) => asset.id,
  );

export async function ingestModelPricesBatch(rawPayload: unknown): Promise<{
  receivedRows: number;
  appliedAssets: number;
  updatedMarkets: number;
}> {
  const rows = ModelPriceInputBatch.assert(rawPayload);
  if (rows.length === 0) {
    return { receivedRows: 0, appliedAssets: 0, updatedMarkets: 0 };
  }

  const latestRows = toLatestRowByTicker(rows);
  const updates: UpdateMarketModelPriceParams[] = [];

  for (const row of latestRows.values()) {
    const assetId = await resolveAssetIdByTicker(row.assetTicker);
    updates.push({
      baseAssetId: AssetId(assetId),
      modelPrice: Cent.new(BigInt(row.priceCents)),
    });
  }

  const updatedMarkets = await Fn.pipe(
    marketWriteRepo.updateMarketModelPrices(updates),
    E.provideService(Db, db),
    E.runPromise,
  );

  return {
    receivedRows: rows.length,
    appliedAssets: updates.length,
    updatedMarkets,
  };
}
// end of LLM written Code
