// beginning of LLM written Code, Model: gpt-5.3-codex-low
import { serverEnv } from '@/lib/server/env';

export type ModelPriceFeedRow = {
  assetTicker: string;
  priceCents: number;
  timestamp: number;
};

export type FetchModelPricesFromFastApiResult =
  | {
      ok: true;
      rows: readonly ModelPriceFeedRow[];
    }
  | {
      ok: false;
      error: string;
      statusCode?: number;
    };

const modelPriceRowsFromUnknown = (payload: unknown): readonly ModelPriceFeedRow[] => {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((value) => {
      if (typeof value !== 'object' || value === null) return null;
      const row = value as Record<string, unknown>;
      if (
        typeof row.assetTicker !== 'string' ||
        typeof row.priceCents !== 'number' ||
        typeof row.timestamp !== 'number'
      ) {
        return null;
      }
      return {
        assetTicker: row.assetTicker,
        priceCents: row.priceCents,
        timestamp: row.timestamp,
      } satisfies ModelPriceFeedRow;
    })
    .filter((row): row is ModelPriceFeedRow => row !== null);
};

export async function fetchModelPricesFromFastApi(): Promise<FetchModelPricesFromFastApiResult> {
  const sourceUrl =
    serverEnv.FASTAPI_MODEL_PRICE_SOURCE_URL ?? 'http://127.0.0.1:8010/model-prices';
  const headers: HeadersInit = {};
  if (serverEnv.FASTAPI_MODEL_PRICE_SOURCE_TOKEN) {
    headers['x-model-price-token'] = serverEnv.FASTAPI_MODEL_PRICE_SOURCE_TOKEN;
  }

  try {
    const response = await fetch(sourceUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      const responseText = await response.text();
      return {
        ok: false,
        error: responseText || 'FastAPI model-price source returned a non-success status',
        statusCode: response.status,
      };
    }

    const payload = (await response.json()) as unknown;
    const rows = modelPriceRowsFromUnknown(payload);
    return { ok: true, rows };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to fetch model-price feed',
    };
  }
}
// end of LLM written Code
