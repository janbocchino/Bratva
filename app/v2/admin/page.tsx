// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { MarketsTable } from '@/components/v2/markets-table';
import { toastActionError } from '@/lib/client/toast-action';
import type { ExploreMarketRow } from '@/lib/server/actions/list-markets';
import { listMarkets } from '@/lib/server/actions/list-markets';

export default function V2AdminPage() {
  const [markets, setMarkets] = useState<readonly ExploreMarketRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const rows = await listMarkets();
        if (!isMounted) return;
        setMarkets(rows);
      } catch (error) {
        toastActionError(error, 'Failed to load markets.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className='flex flex-col gap-6'>
      <header className='flex flex-col gap-1'>
        <h1 className='text-2xl font-semibold tracking-tight md:text-3xl'>Admin</h1>
        <p className='text-sm text-muted-foreground'>
          Read-only market overview with internal identifiers.
        </p>
      </header>

      <div className='rounded-2xl border border-border bg-card p-4 md:p-6'>
        <h2 className='mb-1 text-base font-semibold'>Markets</h2>
        <p className='mb-4 text-sm text-muted-foreground'>
          {isLoading
            ? 'Loading…'
            : `${markets.length} market${markets.length === 1 ? '' : 's'} listed`}
        </p>
        {isLoading ? (
          <div className='flex flex-col gap-2'>
            <Skeleton className='h-12 w-full rounded-2xl' />
            <Skeleton className='h-12 w-full rounded-2xl' />
          </div>
        ) : (
          <MarketsTable
            markets={markets}
            isLoading={false}
            showInternalIds
            detailHrefPrefix='/v2/invest'
          />
        )}
      </div>
    </section>
  );
}
// end of LLM written Code
