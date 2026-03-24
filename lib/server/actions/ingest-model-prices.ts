// beginning of LLM written Code, Model: gpt-5.3-codex
'use server';

import { AssetId } from '@/domain/values/asset';
import { Cent } from '@/domain/values/currencies';
import { Db, db } from '../db';
import { ModelPriceInputBatch, toLatestRowByTicker } from '../model-price-ingest';
import { assetReadRepo } from '../ports/asset';
import { fetchModelPricesFromFastApi } from '../ports/model-price-feed';
import { marketWriteRepo } from '../ports/market';
import { E, Fn } from '@/lib/shared/imports';
import type { UpdateMarketModelPriceParams } from '@/domain/ports/market';

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

export type RefreshModelPricesFromFastApiResult =
  | {
      ok: true;
      receivedRows: number;
      appliedAssets: number;
      updatedMarkets: number;
    }
  | {
      ok: false;
      error: string;
      statusCode?: number;
    };

export async function refreshModelPricesFromFastApi(): Promise<RefreshModelPricesFromFastApiResult> {
  const feedResult = await fetchModelPricesFromFastApi();
  if (!feedResult.ok) {
    return {
      ok: false,
      error: feedResult.error,
      statusCode: feedResult.statusCode,
    };
  }

  try {
    const ingestionResult = await ingestModelPricesBatch(feedResult.rows);
    return {
      ok: true,
      ...ingestionResult,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to ingest model prices',
    };
  }
}
// end of LLM written Code
