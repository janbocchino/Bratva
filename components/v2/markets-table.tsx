// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
/*
Decision questionnaire
- Should the user market list show internal ids?
  - [x] No — user view uses `publicId` links only; admin table opts in via `showInternalIds`.
  - [ ] Always show numeric ids (rejected for user view).
*/
'use client';

import { SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AssetBadge } from '@/components/v2/asset-badge';
import { Money } from '@/components/v2/money';
import type { ExploreMarketRow } from '@/lib/server/actions/list-markets';
import { cn } from '@/lib/utils';

const formatTicker = (ticker: string): string => ticker.toUpperCase();

const STATUS_FILTERS = ['all', 'active', 'pending', 'closed'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const statusVariant = (status: ExploreMarketRow['status']): 'default' | 'secondary' | 'outline' => {
  if (status === 'active') return 'default';
  if (status === 'pending') return 'secondary';
  return 'outline';
};

type MarketsTableProps = {
  markets: readonly ExploreMarketRow[];
  isLoading: boolean;
  showInternalIds?: boolean;
  detailHrefPrefix?: string;
};

export function MarketsTable({
  markets,
  isLoading,
  showInternalIds = false,
  detailHrefPrefix = '/v2/invest',
}: MarketsTableProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return markets.filter((market) => {
      const matchesStatus = statusFilter === 'all' || market.status === statusFilter;
      if (!matchesStatus) return false;
      if (q.length === 0) return true;
      const haystack = [
        market.baseAssetName,
        market.baseAssetTicker,
        market.quoteAssetTicker,
        market.publicId,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [markets, query, statusFilter]);

  if (isLoading) {
    return (
      <div className='flex flex-col gap-3'>
        <Skeleton className='h-12 w-full rounded-2xl' />
        <Skeleton className='h-16 w-full rounded-2xl' />
        <Skeleton className='h-16 w-full rounded-2xl' />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='relative flex-1'>
          <SearchIcon className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search markets'
            className='rounded-2xl border-border bg-card pl-9'
          />
        </div>
        <div className='flex flex-wrap gap-2'>
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type='button'
              onClick={() => setStatusFilter(status)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors',
                statusFilter === status
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-secondary',
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty className='rounded-2xl border border-dashed border-border'>
          <EmptyHeader>
            <EmptyTitle>No markets</EmptyTitle>
            <EmptyDescription>Try a different search or filter.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className='flex flex-col gap-2'>
          {filtered.map((market) => (
            <li key={market.publicId}>
              <Link
                href={`${detailHrefPrefix}/${market.publicId}`}
                className='flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary'
              >
                <AssetBadge ticker={market.baseAssetTicker} />
                <div className='min-w-0 flex-1'>
                  <p className='truncate font-semibold'>{market.baseAssetName}</p>
                  <p className='text-xs text-muted-foreground'>
                    {formatTicker(market.baseAssetTicker)} / {formatTicker(market.quoteAssetTicker)}
                  </p>
                </div>
                <div className='flex flex-col items-end gap-1'>
                  <Money value={market.displayPriceScaled} className='text-sm font-semibold' />
                  <Badge variant={statusVariant(market.status)}>{market.status}</Badge>
                </div>
                {showInternalIds ? (
                  <span className='hidden text-xs text-muted-foreground lg:block'>
                    id {market.id}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
// end of LLM written Code
