// beginning of LLM written Code, Model: Claude Opus 4.7
'use server';

import type { Side } from '@/domain/aggregates/exchange';
import { E } from '@/lib/shared/imports';
import { Db, db } from '../db';
import { assetReadRepo } from '../ports/asset';
import { marketReadRepo } from '../ports/market';
import { orderReadRepo } from '../ports/exchange';
import { runServerDomainEffect } from '../run-server-domain-effect';

export type OpenOrderRow = {
  id: number;
  publicId: string;
  marketId: number;
  marketPublicId: string;
  baseAssetTicker: string;
  quoteAssetTicker: string;
  side: Side;
  /** 18-decimal scaled string, same encoding as `QuoteAmount.toString()`. */
  priceScaled: string;
  /** 18-decimal scaled string, same encoding as `TokenAmount.toString()`. */
  quantityScaled: string;
  filledScaled: string;
  createdAtIso: string;
  expiresAtIso: string;
};

export async function listOpenOrders(p: { userId: number }): Promise<readonly OpenOrderRow[]> {
  const openOrders = await runServerDomainEffect(
    orderReadRepo.getOpenOrdersByUserId(p.userId).pipe(E.provideService(Db, db)),
  );

  const uniqueMarketIds = Array.from(new Set(openOrders.map((o) => o.marketId)));
  const marketById = new Map(
    await Promise.all(
      uniqueMarketIds.map(async (id) => {
        const market = await runServerDomainEffect(
          marketReadRepo.getMarket({ id }).pipe(E.provideService(Db, db)),
        );
        return [id, market] as const;
      }),
    ),
  );

  const uniqueAssetIds = Array.from(
    new Set(
      Array.from(marketById.values()).flatMap((m) => [m.baseAssetId, m.quoteAssetId]),
    ),
  );
  const assetById = new Map(
    await Promise.all(
      uniqueAssetIds.map(async (id) => {
        const asset = await runServerDomainEffect(
          assetReadRepo.getAsset({ id }).pipe(E.provideService(Db, db)),
        );
        return [id, asset] as const;
      }),
    ),
  );

  return openOrders.map((order) => {
    const market = marketById.get(order.marketId);
    const baseTicker = market ? (assetById.get(market.baseAssetId)?.ticker ?? '') : '';
    const quoteTicker = market ? (assetById.get(market.quoteAssetId)?.ticker ?? '') : '';
    return {
      id: order.id,
      publicId: order.publicId,
      marketId: order.marketId,
      marketPublicId: market?.publicId ?? '',
      baseAssetTicker: baseTicker,
      quoteAssetTicker: quoteTicker,
      side: order.kind,
      priceScaled: order.price.toString(),
      quantityScaled: order.quantity.toString(),
      filledScaled: order.filled.toString(),
      createdAtIso: order.createdAt.toISOString(),
      expiresAtIso: order.expiresAt.toISOString(),
    };
  });
}
// end of LLM written Code
