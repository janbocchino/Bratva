// beginning of LLM written Code, Model: gpt-5.3-codex
'use server';

import type { InsertModelPriceParams } from '@/domain/ports/market';
// beginning of LLM written Code, Model: gpt-5.3-codex
/*
Decision questionnaire
- Where should model prices be persisted?
  - [x] Append-only `model_price` table; no writes to `markets`.
  - [ ] Mutable latest snapshot on `markets`.
*/
// end of LLM written Code
import { AssetId } from '@/domain/values/asset';
import { UsdCents, quoteAmountFromUsdCents } from '@/domain/values/usd-cents';
import { E, Fn } from '@/lib/shared/imports';
import { Db, db } from '../db';
import { ModelPriceInputBatch, toLatestRowByTicker } from '../model-price-ingest';
import { assetReadRepo } from '../ports/asset';
import { marketWriteRepo } from '../ports/market';
import { runServerDomainEffect } from '../run-server-domain-effect';

const resolveAssetIdByTicker = async (ticker: string): Promise<number> =>
  await runServerDomainEffect(
    Fn.pipe(assetReadRepo.getAsset({ ticker }), E.provideService(Db, db)),
  ).then((asset) => asset.id);

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
  const inserts: InsertModelPriceParams[] = [];
  const createdAt = new Date();

  for (const row of latestRows.values()) {
    const assetId = await resolveAssetIdByTicker(row.assetTicker);
    // beginning of LLM written Code, Model: Claude Opus 4.5
    inserts.push({
      baseAssetId: AssetId(assetId),
      price: quoteAmountFromUsdCents(UsdCents.fromInteger(row.priceCents)),
      createdAt,
    });
    // end of LLM written Code
  }

  const updatedMarkets = await runServerDomainEffect(
    Fn.pipe(marketWriteRepo.insertModelPrices(inserts), E.provideService(Db, db)),
  );

  return {
    receivedRows: rows.length,
    appliedAssets: inserts.length,
    updatedMarkets,
  };
}
// end of LLM written Code
