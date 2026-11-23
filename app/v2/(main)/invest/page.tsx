// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
'use client';

import { useEffect, useState } from 'react';
import { MarketsTable } from '@/components/v2/markets-table';
import type { ExploreMarketRow } from '@/lib/server/actions/list-markets';
import { listMarkets } from '@/lib/server/actions/list-markets';

const REFRESH_INTERVAL_MS = 1000;

export default function V2InvestPage() {
  const [markets, setMarkets] = useState<readonly ExploreMarketRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let isLoadInFlight = false;

    const loadMarkets = async () => {
      if (isLoadInFlight) return;
      isLoadInFlight = true;
      try {
        const rows = await listMarkets();
        if (!isMounted) return;
        setMarkets(rows);
        setIsLoading(false);
      } finally {
        isLoadInFlight = false;
      }
    };

    void loadMarkets();
    const intervalId = setInterval(() => void loadMarkets(), REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <section className='flex flex-col gap-6'>
      <header className='flex flex-col gap-1'>
        <h1 className='text-2xl font-semibold tracking-tight md:text-3xl'>Invest</h1>
        <p className='text-sm text-muted-foreground'>Live markets — tap a row to trade.</p>
      </header>
      <MarketsTable markets={markets} isLoading={isLoading} />
    </section>
  );
}
// end of LLM written Code
