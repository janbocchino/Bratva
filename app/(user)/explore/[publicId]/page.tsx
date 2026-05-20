'use client';
// beginning of LLM written Code, Model: gpt-5.3-codex
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MarketPriceChart } from '@/components/explore/market-price-chart';
import { formatQuoteAmount } from '@/domain/values/format-fixed-point';
import { formatActionError } from '@/lib/client/format-action-error';
import { ONE_QUOTE_SCALED_STRING, formatUsdFromScaledQuote } from '@/lib/client/format-scaled-usd';
import {
  CHART_LIVE_BUFFER_MS,
  LIVE_TICK_INTERVAL_MS,
  MAX_LIVE_SAMPLES,
  type ChartPoint,
  type ChartTimespan,
  filterPointsByTimespan,
  mergeServerAndLiveTickPoints,
  shouldUseModelPriceChart,
} from '@/lib/client/market-chart-timespan';
import type { AccountSnapshot } from '@/lib/server/actions/get-account';
import { getAccount } from '@/lib/server/actions/get-account';
import type { MarketModelPriceSeriesPoint } from '@/lib/server/actions/get-market-model-price-series';
import { getMarketModelPriceSeries } from '@/lib/server/actions/get-market-model-price-series';
import type { MarketPriceSeriesPoint } from '@/lib/server/actions/get-market-price-series';
import { getMarketPriceSeries } from '@/lib/server/actions/get-market-price-series';
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
  - [x] Server actions derive user identity from the session.
  - [ ] Pass `snapshot.user.id` from the client.
*/

type TradeSide = 'bid' | 'ask';

const SERIES_FULL_REFRESH_MS = 15_000;

// beginning of LLM written Code, Model: Claude Opus 4.7
type ActionStatus =
  | { state: 'idle' }
  | { state: 'submitting'; message: string }
  | { state: 'success'; message: string }
  | { state: 'error'; message: string };

const IDLE_STATUS: ActionStatus = { state: 'idle' };

const asBigInt = (v: bigint | string | number): bigint =>
  typeof v === 'bigint' ? v : typeof v === 'number' ? BigInt(v) : BigInt(v);

const formatFilledFraction = (
  filledScaled: bigint | string | number,
  quantityScaled: bigint | string | number,
): string => {
  const filled = asBigInt(filledScaled);
  const requested = asBigInt(quantityScaled);
  if (requested === 0n) return '0';
  return `${formatQuoteAmount(filled, 4)} / ${formatQuoteAmount(requested, 4)}`;
};

function StatusBanner({ status }: { status: ActionStatus }) {
  if (status.state === 'idle') return null;
  const toneClass =
    status.state === 'error'
      ? 'text-red-700'
      : status.state === 'success'
        ? 'text-emerald-700'
        : 'text-black/70';
  return <p className={`text-xs ${toneClass}`}>{status.message}</p>;
}
// end of LLM written Code

export default function ExploreMarketPage() {
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;

  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [market, setMarket] = useState<ExploreMarketRow | null>(null);
  const [modelSeries, setModelSeries] = useState<readonly MarketModelPriceSeriesPoint[]>([]);
  const [tradeSeries, setTradeSeries] = useState<readonly MarketPriceSeriesPoint[]>([]);
  const [chartTimespan, setChartTimespan] = useState<ChartTimespan>('1d');
  const [nowMs, setNowMs] = useState(() => Date.now());
  /** Client-sampled series at `LIVE_TICK_INTERVAL_MS` (last known price); merged with server rows. */
  const [liveTickPoints, setLiveTickPoints] = useState<ChartPoint[]>([]);
  const modelSeriesRef = useRef(modelSeries);
  const tradeSeriesRef = useRef(tradeSeries);
  modelSeriesRef.current = modelSeries;
  tradeSeriesRef.current = tradeSeries;
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>('');

  const [liquidityAmountDollars, setLiquidityAmountDollars] = useState('10.00');
  const [liquidityStatus, setLiquidityStatus] = useState<ActionStatus>(IDLE_STATUS);

  const [tradePanelOpen, setTradePanelOpen] = useState(false);
  const [tradeSide, setTradeSide] = useState<TradeSide>('bid');
  const [tradePrice, setTradePrice] = useState('');
  const [tradePriceDirty, setTradePriceDirty] = useState(false);
  const [tradeQuantity, setTradeQuantity] = useState('1');
  const [tradeStopLoss, setTradeStopLoss] = useState('');
  const [tradeExpiresAt, setTradeExpiresAt] = useState('');
  const [tradeStatus, setTradeStatus] = useState<ActionStatus>(IDLE_STATUS);

  const isLiquiditySubmitting = liquidityStatus.state === 'submitting';
  const isTradeSubmitting = tradeStatus.state === 'submitting';

  const isTradeDisabled = useMemo(() => market?.status === 'closed', [market?.status]);

  const useModelChart = useMemo(
    () => market !== null && shouldUseModelPriceChart(market.status, market.wasPreviouslyActive),
    [market],
  );

  /** Wire: scaled integer string; input field expects a decimal for `parseFixedPoint`. */
  const latestPriceScaled = useMemo(() => {
    if (market === null) return ONE_QUOTE_SCALED_STRING;
    if (useModelChart) {
      return (
        modelSeries[modelSeries.length - 1]?.priceScaled ??
        market.displayPriceScaled ??
        ONE_QUOTE_SCALED_STRING
      );
    }
    return (
      tradeSeries[tradeSeries.length - 1]?.priceScaled ??
      market.displayPriceScaled ??
      ONE_QUOTE_SCALED_STRING
    );
  }, [market, useModelChart, modelSeries, tradeSeries]);

  const chartRows = useMemo((): ChartPoint[] => {
    if (market === null) return [];
    const serverPts: ChartPoint[] = (useModelChart ? modelSeries : tradeSeries)
      .map((p) => ({
        tMs: Date.parse(p.createdAtIso),
        priceScaled: p.priceScaled,
      }))
      .filter((p) => Number.isFinite(p.tMs));
    const merged = mergeServerAndLiveTickPoints(serverPts, liveTickPoints);
    return filterPointsByTimespan(merged, nowMs, chartTimespan);
  }, [market, useModelChart, modelSeries, tradeSeries, liveTickPoints, chartTimespan, nowMs]);

  const tablePoints = useMemo(():
    | readonly MarketPriceSeriesPoint[]
    | readonly MarketModelPriceSeriesPoint[] => {
    if (market === null) return [];
    return useModelChart ? modelSeries : tradeSeries;
  }, [market, useModelChart, modelSeries, tradeSeries]);
  const defaultTradePriceInput = useMemo(
    () => formatQuoteAmount(BigInt(latestPriceScaled), 8),
    [latestPriceScaled],
  );

  const refreshPageData = useCallback(async () => {
    if (!publicId || publicId.length === 0) return;
    setIsLoading(true);
    setLoadError('');
    try {
      const [account, markets] = await Promise.all([getAccount(), listMarkets()]);
      const selected = markets.find((item) => item.publicId === publicId) ?? null;
      setSnapshot(account);
      setMarket(selected);
      if (selected === null) {
        setLoadError('Market not found.');
        setModelSeries([]);
        setTradeSeries([]);
      } else if (shouldUseModelPriceChart(selected.status, selected.wasPreviouslyActive)) {
        const series = await getMarketModelPriceSeries({
          marketPublicId: publicId,
          limit: 2_000,
        });
        setModelSeries(series);
        setTradeSeries([]);
      } else {
        const series = await getMarketPriceSeries({ marketPublicId: publicId, limit: 2_000 });
        setTradeSeries(series);
        setModelSeries([]);
      }
    } catch (error) {
      setLoadError(formatActionError(error, 'Failed to load market.'));
    } finally {
      setIsLoading(false);
    }
  }, [publicId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: clear live buffer when route or model vs trade chart switches
  useEffect(() => {
    setLiveTickPoints([]);
  }, [publicId, useModelChart]);

  useEffect(() => {
    if (!publicId || publicId.length === 0 || market === null) return;
    const tick = () => {
      const t = Date.now();
      setNowMs(t);
      const lastScaled = useModelChart
        ? modelSeriesRef.current[modelSeriesRef.current.length - 1]?.priceScaled
        : tradeSeriesRef.current[tradeSeriesRef.current.length - 1]?.priceScaled;
      const priceScaled = lastScaled ?? market.displayPriceScaled ?? ONE_QUOTE_SCALED_STRING;
      setLiveTickPoints((prev) => {
        const next =
          prev.length === 0
            ? [
                { tMs: t - LIVE_TICK_INTERVAL_MS, priceScaled },
                { tMs: t, priceScaled },
              ]
            : [...prev, { tMs: t, priceScaled }];
        const cutoff = t - CHART_LIVE_BUFFER_MS;
        return next.filter((p) => p.tMs >= cutoff).slice(-MAX_LIVE_SAMPLES);
      });
    };
    tick();
    const id = setInterval(tick, LIVE_TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [publicId, market, useModelChart]);

  useEffect(() => {
    if (!publicId || publicId.length === 0 || market === null) return;
    const fullRefresh = async () => {
      try {
        if (shouldUseModelPriceChart(market.status, market.wasPreviouslyActive)) {
          const series = await getMarketModelPriceSeries({
            marketPublicId: publicId,
            limit: 2_000,
          });
          setModelSeries(series);
        } else {
          const series = await getMarketPriceSeries({ marketPublicId: publicId, limit: 2_000 });
          setTradeSeries(series);
        }
      } catch {
        /* keep prior series; poll errors are non-fatal */
      }
    };
    const id = setInterval(() => void fullRefresh(), SERIES_FULL_REFRESH_MS);
    return () => clearInterval(id);
  }, [publicId, market]);

  useEffect(() => {
    void refreshPageData();
  }, [refreshPageData]);

  useEffect(() => {
    if (!tradePanelOpen || tradePriceDirty) return;
    setTradePrice(defaultTradePriceInput);
  }, [defaultTradePriceInput, tradePanelOpen, tradePriceDirty]);

  const handleProvideLiquidity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!snapshot || !market) return;
    setLiquidityStatus({ state: 'submitting', message: 'Providing liquidity...' });
    try {
      await provideLiquidityAction({
        marketPublicId: market.publicId,
        amountDollars: liquidityAmountDollars,
      });
      await refreshPageData();
      setLiquidityStatus({
        state: 'success',
        message: `Liquidity provided ($${liquidityAmountDollars}).`,
      });
    } catch (error) {
      setLiquidityStatus({
        state: 'error',
        message: formatActionError(error, 'Failed to provide liquidity.'),
      });
    }
  };

  // beginning of LLM written Code, Model: Claude Opus 4.7
  const handlePlaceTrade = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!snapshot || !market) return;
    if (isTradeDisabled) {
      setTradeStatus({
        state: 'error',
        message: 'Trading is disabled for closed markets.',
      });
      return;
    }

    if (tradeQuantity.trim() === '' || Number(tradeQuantity) <= 0) {
      setTradeStatus({ state: 'error', message: 'Quantity must be > 0.' });
      return;
    }

    const sideLabel = tradeSide === 'bid' ? 'buy' : 'sell';
    setTradeStatus({
      state: 'submitting',
      message: `Placing ${sideLabel} order for ${tradeQuantity} @ ${tradePrice}...`,
    });
    try {
      const placed = await placeOrder({
        marketId: market.id,
        side: tradeSide,
        price: tradePrice,
        quantity: tradeQuantity,
        stopLoss: tradeStopLoss.trim() === '' ? undefined : tradeStopLoss,
        expiresAt:
          tradeExpiresAt.trim() === '' ? undefined : new Date(tradeExpiresAt).toISOString(),
      });
      await refreshPageData();

      const filledLabel = formatFilledFraction(placed.filled, placed.quantity);
      const wasFilled = placed.status === 'filled';
      const message = wasFilled
        ? `${sideLabel.toUpperCase()} filled — ${filledLabel} at avg ${formatUsdFromScaledQuote(placed.price)} (order ${placed.publicId}).`
        : `${sideLabel.toUpperCase()} order placed — ${filledLabel} matched so far (order ${placed.publicId}, status ${placed.status}).`;
      setTradeStatus({ state: 'success', message });
    } catch (error) {
      setTradeStatus({
        state: 'error',
        message: formatActionError(error, 'Failed to place order.'),
      });
    }
  };
  // end of LLM written Code

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
        <h2 className='text-lg font-medium'>Price series</h2>
        {/* beginning of LLM written Code, Model: Claude Opus 4.5 */}
        <MarketPriceChart
          variant={useModelChart ? 'model' : 'trade'}
          rows={chartRows}
          timespan={chartTimespan}
          windowEndMs={nowMs}
          onTimespanChange={setChartTimespan}
          emptyMessage={
            useModelChart
              ? 'No model price history yet for this market.'
              : 'No trade price history yet for this market.'
          }
        />
        {tablePoints.length > 0 ? (
          <div className='grid gap-2 sm:grid-cols-2'>
            {[...tablePoints]
              .slice(-10)
              .reverse()
              .map((p) => (
                <div
                  key={p.createdAtIso}
                  className='flex items-baseline justify-between rounded border border-black/10 px-3 py-2'
                >
                  <span className='text-sm font-medium'>
                    {formatUsdFromScaledQuote(p.priceScaled)}
                  </span>
                  <span className='text-xs text-black/60'>
                    {new Date(p.createdAtIso).toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        ) : null}
        {/* end of LLM written Code */}
      </section>

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
          <StatusBanner status={liquidityStatus} />
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
              <div className='flex flex-col gap-1'>
                <label className='text-sm text-black/70' htmlFor='trade-price'>
                  Price
                </label>
                <input
                  id='trade-price'
                  className='rounded border border-black/20 px-3 py-2 text-sm'
                  type='text'
                  value={tradePrice}
                  placeholder={defaultTradePriceInput}
                  onChange={(event) => {
                    setTradePriceDirty(true);
                    setTradePrice(event.target.value);
                  }}
                  disabled={snapshot === null || isTradeDisabled || isTradeSubmitting}
                />
              </div>
              <div className='flex flex-col gap-1'>
                <label className='text-sm text-black/70' htmlFor='trade-quantity'>
                  Quantity
                </label>
                <input
                  id='trade-quantity'
                  className='rounded border border-black/20 px-3 py-2 text-sm'
                  type='text'
                  value={tradeQuantity}
                  onChange={(event) => setTradeQuantity(event.target.value)}
                  disabled={snapshot === null || isTradeDisabled || isTradeSubmitting}
                />
              </div>
              <div className='flex flex-col gap-1'>
                <label className='text-sm text-black/70' htmlFor='trade-stop-loss'>
                  Stop Loss (optional)
                </label>
                <input
                  id='trade-stop-loss'
                  className='rounded border border-black/20 px-3 py-2 text-sm'
                  type='text'
                  value={tradeStopLoss}
                  placeholder='0'
                  onChange={(event) => setTradeStopLoss(event.target.value)}
                  disabled={snapshot === null || isTradeDisabled || isTradeSubmitting}
                />
              </div>
              <div className='flex flex-col gap-1'>
                <label className='text-sm text-black/70' htmlFor='trade-expires-at'>
                  Expires At (optional)
                </label>
                <input
                  id='trade-expires-at'
                  className='rounded border border-black/20 px-3 py-2 text-sm'
                  type='datetime-local'
                  value={tradeExpiresAt}
                  onChange={(event) => setTradeExpiresAt(event.target.value)}
                  disabled={snapshot === null || isTradeDisabled || isTradeSubmitting}
                />
              </div>
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
              <div className='sm:col-span-2'>
                <StatusBanner status={tradeStatus} />
              </div>
            </form>
          </section>
        ) : null}
      </section>
    </section>
  );
}
// end of LLM written Code
