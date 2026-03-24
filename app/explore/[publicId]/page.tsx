'use client';
// beginning of LLM written Code, Model: gpt-5.3-codex
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AccountSnapshot } from '@/lib/server/actions/get-account';
import { getAccount } from '@/lib/server/actions/get-account';
import type { ExploreMarketRow } from '@/lib/server/actions/list-markets';
import { listMarkets } from '@/lib/server/actions/list-markets';
import { placeOrder } from '@/lib/server/actions/place-order';
import { provideLiquidityAction } from '@/lib/server/actions/provide-liquidity';

/*
Decision questionnaire
- Where should market actions live?
  - [x] Dedicated `/explore/[publicId]` page to keep action context explicit.
  - [ ] Inline expansion on `/explore`.
- How should user identity be provided to actions?
  - [x] Use implicit account snapshot (`getAccount`) and pass `snapshot.user.id`.
  - [ ] Manual user id entry.
*/

type TradeSide = 'bid' | 'ask';

const toDatetimeLocalValue = (date: Date): string => {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const defaultExpiry = (): string => {
  const future = new Date(Date.now() + 60 * 60 * 1000);
  return toDatetimeLocalValue(future);
};

export default function ExploreMarketPage() {
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;

  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [market, setMarket] = useState<ExploreMarketRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>('');

  const [liquidityAmountDollars, setLiquidityAmountDollars] = useState('10.00');
  const [liquidityStatus, setLiquidityStatus] = useState('');
  const [isLiquiditySubmitting, setIsLiquiditySubmitting] = useState(false);

  const [tradePanelOpen, setTradePanelOpen] = useState(false);
  const [tradeSide, setTradeSide] = useState<TradeSide>('bid');
  const [tradePrice, setTradePrice] = useState('100');
  const [tradeQuantity, setTradeQuantity] = useState('1');
  const [tradeStopLoss, setTradeStopLoss] = useState('90');
  const [tradeExpiresAt, setTradeExpiresAt] = useState(defaultExpiry);
  const [tradeStatus, setTradeStatus] = useState('');
  const [isTradeSubmitting, setIsTradeSubmitting] = useState(false);

  const isTradeDisabled = useMemo(() => market?.status === 'closed', [market?.status]);

  const refreshPageData = useCallback(async () => {
    if (!publicId || publicId.length === 0) return;
    setIsLoading(true);
    setLoadError('');
    try {
      const [account, markets] = await Promise.all([getAccount(), listMarkets()]);
      const selected = markets.find((item) => item.publicId === publicId) ?? null;
      setSnapshot(account);
      setMarket(selected);
      if (selected === null) setLoadError('Market not found.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load market.';
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [publicId]);

  useEffect(() => {
    void refreshPageData();
  }, [refreshPageData]);

  const handleProvideLiquidity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!snapshot || !market) return;
    setLiquidityStatus('');
    setIsLiquiditySubmitting(true);
    try {
      await provideLiquidityAction({
        userId: snapshot.user.id,
        marketPublicId: market.publicId,
        amountDollars: liquidityAmountDollars,
      });
      await refreshPageData();
      setLiquidityStatus('Liquidity provided.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to provide liquidity.';
      setLiquidityStatus(message);
    } finally {
      setIsLiquiditySubmitting(false);
    }
  };

  const handlePlaceTrade = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!snapshot || !market) return;
    if (isTradeDisabled) {
      setTradeStatus('Trading is disabled for closed markets.');
      return;
    }

    const quantity = Number.parseInt(tradeQuantity, 10);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setTradeStatus('Quantity must be a positive integer.');
      return;
    }

    setTradeStatus('');
    setIsTradeSubmitting(true);
    try {
      const placed = await placeOrder({
        userId: snapshot.user.id,
        marketId: market.id,
        side: tradeSide,
        price: tradePrice,
        quantity,
        stopLoss: tradeStopLoss,
        expiresAt: new Date(tradeExpiresAt).toISOString(),
      });
      await refreshPageData();
      setTradeStatus(
        `Order placed (${placed.publicId}) as ${tradeSide === 'bid' ? 'buy' : 'sell'}.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to place order.';
      setTradeStatus(message);
    } finally {
      setIsTradeSubmitting(false);
    }
  };

  if (isLoading) {
    return <section className='text-sm text-black/70'>Loading market...</section>;
  }

  if (market === null) {
    return (
      <section className='flex flex-col gap-3'>
        <h1 className='text-2xl font-semibold tracking-tight'>Market</h1>
        <p className='text-sm text-black/70'>{loadError || 'Market not found.'}</p>
        <a
          className='w-fit rounded border border-black/20 px-3 py-2 text-sm font-medium'
          href='/explore'
        >
          Back to Explore
        </a>
      </section>
    );
  }

  return (
    <section className='flex flex-col gap-6'>
      <header className='flex flex-col gap-1'>
        <h1 className='text-3xl font-semibold tracking-tight'>{market.baseAssetName}</h1>
        <p className='text-sm text-black/70'>
          {market.baseAssetTicker.toUpperCase()} / {market.quoteAssetTicker.toUpperCase()} | status{' '}
          {market.status}
        </p>
      </header>

      {loadError ? <p className='text-sm text-black/70'>{loadError}</p> : null}
      {snapshot === null ? (
        <p className='text-sm text-black/70'>
          No active account found. Create an account first on{' '}
          <a className='underline' href='/account'>
            /account
          </a>
          .
        </p>
      ) : null}

      <section className='flex flex-col gap-3 rounded-lg border border-black/10 p-4'>
        <h2 className='text-lg font-medium'>Actions</h2>
        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            className='rounded border border-black/20 px-3 py-2 text-sm font-medium'
            onClick={() => setTradePanelOpen(false)}
          >
            Provide Liquidity
          </button>
          <button
            type='button'
            className={`rounded border px-3 py-2 text-sm font-medium ${
              isTradeDisabled
                ? 'cursor-not-allowed border-black/10 bg-black/10 text-black/40'
                : 'border-black/20'
            }`}
            onClick={() => {
              if (!isTradeDisabled) setTradePanelOpen(true);
            }}
            disabled={isTradeDisabled}
            aria-disabled={isTradeDisabled}
          >
            Trade
          </button>
        </div>

        <form onSubmit={handleProvideLiquidity} className='flex max-w-sm flex-col gap-2'>
          <label className='text-sm text-black/70' htmlFor='provide-amount'>
            Amount (USD)
          </label>
          <input
            id='provide-amount'
            className='rounded border border-black/20 px-3 py-2 text-sm'
            type='text'
            value={liquidityAmountDollars}
            onChange={(event) => setLiquidityAmountDollars(event.target.value)}
            disabled={snapshot === null || isLiquiditySubmitting}
          />
          <button
            className='w-fit rounded border border-black/20 px-3 py-2 text-sm font-medium'
            type='submit'
            disabled={snapshot === null || isLiquiditySubmitting}
          >
            {isLiquiditySubmitting ? 'Providing...' : 'Submit Liquidity'}
          </button>
          {liquidityStatus ? <p className='text-xs text-black/70'>{liquidityStatus}</p> : null}
        </form>

        {tradePanelOpen ? (
          <section className='mt-2 flex flex-col gap-3 border-t border-black/10 pt-3'>
            <div className='flex gap-2'>
              <button
                type='button'
                className={`rounded border px-3 py-2 text-sm font-medium ${
                  tradeSide === 'bid' ? 'border-black bg-black text-white' : 'border-black/20'
                }`}
                onClick={() => setTradeSide('bid')}
              >
                Buy
              </button>
              <button
                type='button'
                className={`rounded border px-3 py-2 text-sm font-medium ${
                  tradeSide === 'ask' ? 'border-black bg-black text-white' : 'border-black/20'
                }`}
                onClick={() => setTradeSide('ask')}
              >
                Sell
              </button>
            </div>

            <form onSubmit={handlePlaceTrade} className='grid max-w-2xl gap-2 sm:grid-cols-2'>
              <input
                className='rounded border border-black/20 px-3 py-2 text-sm'
                type='text'
                placeholder='Price'
                value={tradePrice}
                onChange={(event) => setTradePrice(event.target.value)}
                disabled={snapshot === null || isTradeDisabled || isTradeSubmitting}
              />
              <input
                className='rounded border border-black/20 px-3 py-2 text-sm'
                type='number'
                min={1}
                step={1}
                placeholder='Quantity'
                value={tradeQuantity}
                onChange={(event) => setTradeQuantity(event.target.value)}
                disabled={snapshot === null || isTradeDisabled || isTradeSubmitting}
              />
              <input
                className='rounded border border-black/20 px-3 py-2 text-sm'
                type='text'
                placeholder='Stop Loss'
                value={tradeStopLoss}
                onChange={(event) => setTradeStopLoss(event.target.value)}
                disabled={snapshot === null || isTradeDisabled || isTradeSubmitting}
              />
              <input
                className='rounded border border-black/20 px-3 py-2 text-sm'
                type='datetime-local'
                value={tradeExpiresAt}
                onChange={(event) => setTradeExpiresAt(event.target.value)}
                disabled={snapshot === null || isTradeDisabled || isTradeSubmitting}
              />
              <div className='sm:col-span-2'>
                <button
                  className='rounded border border-black/20 px-3 py-2 text-sm font-medium'
                  type='submit'
                  disabled={snapshot === null || isTradeDisabled || isTradeSubmitting}
                >
                  {isTradeSubmitting
                    ? 'Submitting...'
                    : `Submit ${tradeSide === 'bid' ? 'Buy' : 'Sell'}`}
                </button>
              </div>
              {tradeStatus ? (
                <p className='text-xs text-black/70 sm:col-span-2'>{tradeStatus}</p>
              ) : null}
            </form>
          </section>
        ) : null}
      </section>
    </section>
  );
}
// end of LLM written Code
