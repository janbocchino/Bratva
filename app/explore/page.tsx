'use client';

import { useEffect, useState } from 'react';
import { formatUsdFromScaledQuote } from '@/lib/client/format-scaled-usd';
import { refreshModelPricesFromFastApi } from '@/lib/server/actions/ingest-model-prices';
import type { ExploreMarketRow } from '@/lib/server/actions/list-markets';
import { listMarkets } from '@/lib/server/actions/list-markets';

// beginning of LLM written Code, Model: gpt-5.3-codex-low
/*
Decision questionnaire
- Should market interaction stay inline or navigate to a dedicated page?
  - [x] Dedicated page via `/explore/[publicId]` for clearer action workflow.
  - [ ] Inline row expansion.
*/
const formatTicker = (ticker: string): string => ticker.toUpperCase();
// end of LLM written Code

const formatMarketLabel = (market: ExploreMarketRow): string => {
  const base = `${market.baseAssetName} (${formatTicker(market.baseAssetTicker)})`;
  if (market.quoteAssetTicker === 'usd') return base;
  return `${base} / ${market.quoteAssetName} (${formatTicker(market.quoteAssetTicker)})`;
};

const REFRESH_INTERVAL_MS = 1000;

export default function ExplorePage() {
  const [markets, setMarkets] = useState<readonly ExploreMarketRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let isRefreshInFlight = false;

    const refreshAndLoad = async () => {
      if (isRefreshInFlight) return;
      isRefreshInFlight = true;
      try {
        const refreshResult = await refreshModelPricesFromFastApi();
        if (!refreshResult.ok && isMounted) {
          setRefreshMessage(`Price source unavailable: ${refreshResult.error}`);
        } else if (isMounted) {
          setRefreshMessage(null);
        }

        const rows = await listMarkets();
        if (!isMounted) return;
        setMarkets(rows);
        setIsLoading(false);
      } finally {
        isRefreshInFlight = false;
      }
    };

    refreshAndLoad();
    const intervalId = setInterval(refreshAndLoad, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <section className='flex flex-col gap-6'>
      <header className='flex flex-col gap-1'>
        <h1 className='text-3xl font-semibold tracking-tight'>Explore</h1>
        <p className='text-sm text-black/70'>All markets listed in one place.</p>
      </header>

      {isLoading ? <p className='text-sm text-black/70'>Loading markets...</p> : null}
      {!isLoading && refreshMessage !== null ? (
        <p className='text-sm text-black/70'>{refreshMessage}</p>
      ) : null}

      <div className='overflow-hidden rounded-lg border border-black/10'>
        <table className='w-full border-collapse text-left text-sm'>
          <thead className='border-b border-black/10 bg-black/5'>
            <tr>
              <th className='px-4 py-3 font-medium'>Market</th>
              <th className='px-4 py-3 font-medium'>Display Price</th>
              <th className='px-4 py-3 font-medium'>Status</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((market) => (
              <tr key={market.publicId} className='border-b border-black/10 last:border-b-0'>
                <td className='px-4 py-3'>
                  <a
                    className='block rounded px-1 py-1 transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black'
                    href={`/explore/${market.publicId}`}
                  >
                    <p className='font-medium'>{formatMarketLabel(market)}</p>
                    <p className='text-xs text-black/60'>market {market.id}</p>
                  </a>
                </td>
                <td className='px-4 py-3 font-mono'>
                  {formatUsdFromScaledQuote(market.displayPriceScaled)}
                </td>
                <td className='px-4 py-3'>
                  <span className='rounded border border-black/15 px-2 py-1 text-xs uppercase tracking-wide'>
                    {market.status}
                  </span>
                </td>
              </tr>
            ))}
            {!isLoading && markets.length === 0 ? (
              <tr>
                <td className='px-4 py-6 text-sm text-black/60' colSpan={3}>
                  No markets found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
// end of LLM written Code
