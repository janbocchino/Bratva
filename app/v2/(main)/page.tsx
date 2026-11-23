'use client';
import { ArrowUpRightIcon, LineChartIcon, WalletIcon } from 'lucide-react';
// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AssetBadge } from '@/components/v2/asset-badge';
import { ChangeBadge } from '@/components/v2/change-badge';
import { Money } from '@/components/v2/money';
import { usePortfolioShell } from '@/components/v2/portfolio-shell-provider';
import { StatTile } from '@/components/v2/stat-tile';
import { formatTokenAmount } from '@/domain/values/format-fixed-point';
import { buildPortfolioSummary } from '@/lib/client/portfolio-valuation';
import type { AccountSnapshot } from '@/lib/server/actions/get-account';
import { getAccount } from '@/lib/server/actions/get-account';
import type { ExploreMarketRow } from '@/lib/server/actions/list-markets';
import { listMarkets } from '@/lib/server/actions/list-markets';

export default function V2HomePage() {
  const { refreshPortfolio } = usePortfolioShell();
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [markets, setMarkets] = useState<readonly ExploreMarketRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [account, marketRows] = await Promise.all([getAccount(), listMarkets()]);
    setSnapshot(account);
    setMarkets(marketRows);
    setIsLoading(false);
    await refreshPortfolio();
  }, [refreshPortfolio]);

  useEffect(() => {
    void load();
  }, [load]);

  const portfolio = useMemo(
    () => (snapshot !== null ? buildPortfolioSummary(snapshot, markets) : null),
    [snapshot, markets],
  );

  const tokenHoldings = useMemo(
    () => portfolio?.holdings.filter((h) => !h.isUsd && h.balanceScaled > 0n) ?? [],
    [portfolio],
  );

  const topMarkets = useMemo(() => markets.slice(0, 5), [markets]);

  if (isLoading) {
    return (
      <section className='flex flex-col gap-6'>
        <Skeleton className='h-40 w-full rounded-3xl' />
        <Skeleton className='h-32 w-full rounded-2xl' />
      </section>
    );
  }

  if (snapshot === null) {
    return (
      <section className='flex flex-col items-center gap-8 py-10 text-center'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-3xl font-semibold tracking-tight md:text-4xl'>Trade with clarity</h1>
          <p className='max-w-md text-sm text-muted-foreground'>
            Sign in to view your portfolio, explore markets, and place trades.
          </p>
        </div>
        <div className='flex flex-wrap justify-center gap-3'>
          <Button render={<Link href='/v2/account' />}>Get started</Button>
          <Button variant='outline' render={<Link href='/v2/invest' />}>
            Browse markets
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className='flex flex-col gap-8'>
      <header className='flex flex-col gap-1'>
        <p className='text-sm text-muted-foreground'>Welcome back, {snapshot.user.displayName}</p>
        <h1 className='text-2xl font-semibold tracking-tight md:text-3xl'>Portfolio</h1>
      </header>

      <div className='rounded-3xl border border-border bg-card p-6 md:p-8'>
        <p className='text-sm text-muted-foreground'>Total value</p>
        <Money
          value={portfolio?.totalUsdScaled ?? 0n}
          className='mt-1 text-4xl font-semibold md:text-5xl'
        />
        <div className='mt-4 flex flex-wrap gap-2'>
          <ChangeBadge value={0} />
          <span className='text-xs text-muted-foreground'>Session change unavailable</span>
        </div>
        <div className='mt-6 grid grid-cols-2 gap-3 md:grid-cols-3'>
          <StatTile label='Cash' value={<Money value={portfolio?.cashUsdScaled ?? 0n} />} />
          <StatTile label='Holdings' value={tokenHoldings.length} />
          <StatTile label='Open orders' value={snapshot.openOrders.length} />
        </div>
      </div>

      <div className='grid grid-cols-3 gap-3'>
        <Link
          href='/v2/invest'
          className='flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary'
        >
          <span className='flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary'>
            <LineChartIcon className='size-4' />
          </span>
          <span className='text-sm font-medium'>Invest</span>
        </Link>
        <Link
          href='/v2/account'
          className='flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary'
        >
          <span className='flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary'>
            <WalletIcon className='size-4' />
          </span>
          <span className='text-sm font-medium'>Add funds</span>
        </Link>
        <Link
          href='/v2/invest'
          className='flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary'
        >
          <span className='flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary'>
            <ArrowUpRightIcon className='size-4' />
          </span>
          <span className='text-sm font-medium'>Markets</span>
        </Link>
      </div>

      {tokenHoldings.length > 0 ? (
        <section>
          <h2 className='mb-4 text-base font-semibold'>Your holdings</h2>
          <ul className='flex flex-col gap-2'>
            {tokenHoldings.map((holding) => (
              <li
                key={holding.assetId}
                className='flex items-center gap-3 rounded-2xl border border-border bg-card p-4'
              >
                <AssetBadge ticker={holding.market?.baseAssetTicker ?? 'TOK'} />
                <div className='min-w-0 flex-1'>
                  <p className='font-medium'>
                    {holding.market?.baseAssetName ?? `Asset ${holding.assetId}`}
                  </p>
                  <p className='text-xs text-muted-foreground tabular-nums'>
                    {formatTokenAmount(holding.balanceScaled)}
                  </p>
                </div>
                {holding.valueUsdScaled !== null ? (
                  <Money value={holding.valueUsdScaled} className='text-sm font-semibold' />
                ) : null}
                {holding.market !== null ? (
                  <Button
                    size='sm'
                    variant='outline'
                    render={<Link href={`/v2/invest/${holding.market.publicId}`} />}
                  >
                    Trade
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-base font-semibold'>Top markets</h2>
          <Link href='/v2/invest' className='text-sm text-primary hover:underline'>
            View all
          </Link>
        </div>
        <ul className='grid gap-2 md:grid-cols-2'>
          {topMarkets.map((market) => (
            <li key={market.publicId}>
              <Link
                href={`/v2/invest/${market.publicId}`}
                className='flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary'
              >
                <AssetBadge ticker={market.baseAssetTicker} />
                <div className='min-w-0 flex-1'>
                  <p className='truncate font-medium'>{market.baseAssetName}</p>
                  <p className='text-xs text-muted-foreground uppercase'>
                    {market.baseAssetTicker}
                  </p>
                </div>
                <Money value={market.displayPriceScaled} className='text-sm font-semibold' />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
// end of LLM written Code
