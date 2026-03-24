'use server';

import { E } from '@/lib/shared/imports';
import { Db, db } from '../db';
import { assetReadRepo } from '../ports/asset';
import { marketReadRepo } from '../ports/market';

// beginning of LLM written Code, Model: gpt-5.3-codex-low
export type ExploreMarketRow = {
  id: number;
  publicId: string;
  baseAssetName: string;
  baseAssetTicker: string;
  quoteAssetName: string;
  quoteAssetTicker: string;
  status: 'closed' | 'pending' | 'active';
  modelPriceCents: string;
};

export async function listMarkets(): Promise<readonly ExploreMarketRow[]> {
  const markets = await marketReadRepo.listMarkets().pipe(E.provideService(Db, db), E.runPromise);
  const rows = await Promise.all(
    markets.map(async (market) => {
      const [baseAsset, quoteAsset] = await Promise.all([
        assetReadRepo.getAsset({ id: market.baseAssetId }).pipe(E.provideService(Db, db), E.runPromise),
        assetReadRepo.getAsset({ id: market.quoteAssetId }).pipe(E.provideService(Db, db), E.runPromise),
      ]);
      return {
        id: market.id,
        publicId: market.publicId,
        baseAssetName: baseAsset.name,
        baseAssetTicker: baseAsset.ticker,
        quoteAssetName: quoteAsset.name,
        quoteAssetTicker: quoteAsset.ticker,
        status: market.status,
        modelPriceCents: market.modelPrice.toString(),
      };
    }),
  );

  return rows.map((market) => ({
    id: market.id,
    publicId: market.publicId,
    baseAssetName: market.baseAssetName,
    baseAssetTicker: market.baseAssetTicker,
    quoteAssetName: market.quoteAssetName,
    quoteAssetTicker: market.quoteAssetTicker,
    status: market.status,
    modelPriceCents: market.modelPriceCents,
  }));
}
// end of LLM written Code
