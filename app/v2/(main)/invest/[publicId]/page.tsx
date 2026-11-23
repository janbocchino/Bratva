'use client';
// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MarketPriceChart } from '@/components/explore/market-price-chart';
import { ValuationSummaryCard } from '@/components/explore/valuation-summary-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AssetBadge } from '@/components/v2/asset-badge';
import { Money } from '@/components/v2/money';
import { type TradeSide, TradeTicket } from '@/components/v2/trade-ticket';
import { formatQuoteAmount } from '@/domain/values/format-fixed-point';
import { formatActionError } from '@/lib/client/format-action-error';
import { ONE_QUOTE_SCALED_STRING, formatUsdFromScaledQuote } from '@/lib/client/format-scaled-usd';
import {
  CHART_LIVE_BUFFER_MS,
  type ChartPoint,
  type ChartTimespan,
  LIVE_TICK_INTERVAL_MS,
  MAX_LIVE_SAMPLES,
  filterPointsByTimespan,
  mergeServerAndLiveTickPoints,
  shouldUseModelPriceChart,
} from '@/lib/client/market-chart-timespan';
import { toastActionError, toastActionSuccess } from '@/lib/client/toast-action';
import type { AccountSnapshot } from '@/lib/server/actions/get-account';
import { getAccount } from '@/lib/server/actions/get-account';
import type { AssetValuationSummary } from '@/lib/server/actions/get-asset-valuation-summary';
import { getAssetValuationSummary } from '@/lib/server/actions/get-asset-valuation-summary';
import type { MarketModelPriceSeriesPoint } from '@/lib/server/actions/get-market-model-price-series';
import { getMarketModelPriceSeries } from '@/lib/server/actions/get-market-model-price-series';
import type { MarketPriceSeriesPoint } from '@/lib/server/actions/get-market-price-series';
import { getMarketPriceSeries } from '@/lib/server/actions/get-market-price-series';
import type { ExploreMarketRow } from '@/lib/server/actions/list-markets';
import { listMarkets } from '@/lib/server/actions/list-markets';
import { placeOrder } from '@/lib/server/actions/place-order';
import { provideLiquidityAction } from '@/lib/server/actions/provide-liquidity';

const SERIES_FULL_REFRESH_MS = 15_000;
const CHART_UP_COLOR = 'var(--color-primary)';
const CHART_DOWN_COLOR = 'var(--color-destructive)';

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

export default function V2InvestMarketPage() {
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;

  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [market, setMarket] = useState<ExploreMarketRow | null>(null);
  const [modelSeries, setModelSeries] = useState<readonly MarketModelPriceSeriesPoint[]>([]);
  const [tradeSeries, setTradeSeries] = useState<readonly MarketPriceSeriesPoint[]>([]);
  const [valuationSummary, setValuationSummary] = useState<AssetValuationSummary | null>(null);
  const [valuationSummaryError, setValuationSummaryError] = useState('');
  const [isValuationSummaryLoading, setIsValuationSummaryLoading] = useState(false);
  const [chartTimespan, setChartTimespan] = useState<ChartTimespan>('1d');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [liveTickPoints, setLiveTickPoints] = useState<ChartPoint[]>([]);
  const modelSeriesRef = useRef(modelSeries);
  const tradeSeriesRef = useRef(tradeSeries);
  modelSeriesRef.current = modelSeries;
  tradeSeriesRef.current = tradeSeries;
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [liquidityAmountDollars, setLiquidityAmountDollars] = useState('10.00');
  const [isLiquiditySubmitting, setIsLiquiditySubmitting] = useState(false);

  const [actionTab, setActionTab] = useState<'liquidity' | 'trade'>('liquidity');
  const [tradeSide, setTradeSide] = useState<TradeSide>('bid');
  const [tradePrice, setTradePrice] = useState('');
  const [tradePriceDirty, setTradePriceDirty] = useState(false);
  const [tradeQuantity, setTradeQuantity] = useState('1');
  const [tradeStopLoss, setTradeStopLoss] = useState('');
  const [tradeExpiresAt, setTradeExpiresAt] = useState('');
  const [isTradeSubmitting, setIsTradeSubmitting] = useState(false);

  const isLiquidityProviderForMarket = useMemo(
    () =>
      market !== null && snapshot !== null && snapshot.activeLiquidityMarketIds.includes(market.id),
    [market, snapshot],
  );

  const tradeDisabledReason = useMemo(() => {
    if (market?.status === 'closed') return 'Trading is disabled for closed markets.';
    if (isLiquidityProviderForMarket) {
      return "You can't trade this market while you have an active liquidity position.";
    }
    return null;
  }, [isLiquidityProviderForMarket, market?.status]);

  const isTradeDisabled = tradeDisabledReason !== null;

  const useModelChart = useMemo(
    () => market !== null && shouldUseModelPriceChart(market.status, market.wasPreviouslyActive),
    [market],
  );

  const shouldShowAnalystSummary = useModelChart;

  const clearValuationSummaryState = useCallback(() => {
    setValuationSummary(null);
    setValuationSummaryError('');
    setIsValuationSummaryLoading(false);
  }, []);

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
      const selectedUsesModelChart =
        selected !== null &&
        shouldUseModelPriceChart(selected.status, selected.wasPreviouslyActive);
      setSnapshot(account);
      setMarket(selected);
      setValuationSummaryError('');
      if (selected === null) {
        setLoadError('Market not found.');
        setModelSeries([]);
        setTradeSeries([]);
        clearValuationSummaryState();
      } else if (selectedUsesModelChart) {
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

      if (selected !== null && selectedUsesModelChart) {
        setIsValuationSummaryLoading(true);
        try {
          const summary = await getAssetValuationSummary({
            baseAssetPublicId: selected.baseAssetPublicId,
          });
          setValuationSummary(summary);
        } catch (error) {
          setValuationSummaryError(formatActionError(error, 'Failed to load summary.'));
        } finally {
          setIsValuationSummaryLoading(false);
        }
      } else {
        clearValuationSummaryState();
      }
    } catch (error) {
      setLoadError(formatActionError(error, 'Failed to load market.'));
      toastActionError(error, 'Failed to load market.');
    } finally {
      setIsLoading(false);
    }
  }, [publicId, clearValuationSummaryState]);

  useEffect(() => {
    if (market === null || !shouldShowAnalystSummary) return;
    const id = setInterval(async () => {
      try {
        const summary = await getAssetValuationSummary({
          baseAssetPublicId: market.baseAssetPublicId,
        });
        setValuationSummary(summary);
      } catch {
        /* non-fatal */
      }
    }, 90_000);
    return () => clearInterval(id);
  }, [market, shouldShowAnalystSummary]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: clear live buffer when route or model vs trade chart switches
  useEffect(() => {
    setLiveTickPoints([]);
    if (!shouldShowAnalystSummary) clearValuationSummaryState();
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
        /* keep prior series */
      }
    };
    const id = setInterval(() => void fullRefresh(), SERIES_FULL_REFRESH_MS);
    return () => clearInterval(id);
  }, [publicId, market]);

  useEffect(() => {
    void refreshPageData();
  }, [refreshPageData]);

  useEffect(() => {
    if (actionTab !== 'trade' || tradePriceDirty) return;
    setTradePrice(defaultTradePriceInput);
  }, [defaultTradePriceInput, actionTab, tradePriceDirty]);

  const handleProvideLiquidity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!snapshot || !market) return;
    setIsLiquiditySubmitting(true);
    try {
      await provideLiquidityAction({
        marketPublicId: market.publicId,
        amountDollars: liquidityAmountDollars,
      });
      await refreshPageData();
      toastActionSuccess(`Liquidity provided ($${liquidityAmountDollars}).`);
    } catch (error) {
      toastActionError(error, 'Failed to provide liquidity.');
    } finally {
      setIsLiquiditySubmitting(false);
    }
  };

  const handlePlaceTrade = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!snapshot || !market) return;
    if (isTradeDisabled) {
      toastActionError(
        new Error(tradeDisabledReason ?? 'Trading is disabled for this market.'),
        'Trading is disabled for this market.',
      );
      return;
    }

    if (tradeQuantity.trim() === '' || Number(tradeQuantity) <= 0) {
      toastActionError(new Error('Quantity must be > 0.'), 'Quantity must be > 0.');
      return;
    }

    const sideLabel = tradeSide === 'bid' ? 'buy' : 'sell';
    setIsTradeSubmitting(true);
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
      toastActionSuccess(message);
    } catch (error) {
      toastActionError(error, 'Failed to place order.');
    } finally {
      setIsTradeSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className='flex flex-col gap-4'>
        <Skeleton className='h-10 w-64 rounded-2xl' />
        <Skeleton className='h-80 w-full rounded-2xl' />
      </section>
    );
  }

  if (market === null) {
    return (
      <section className='flex flex-col gap-4'>
        <h1 className='text-2xl font-semibold tracking-tight'>Market</h1>
        <Alert>
          <AlertDescription>{loadError || 'Market not found.'}</AlertDescription>
        </Alert>
        <Button variant='outline' render={<Link href='/v2/invest' />}>
          Back to Invest
        </Button>
      </section>
    );
  }

  return (
    <section className='flex flex-col gap-6'>
      <header className='flex items-start gap-3'>
        <AssetBadge ticker={market.baseAssetTicker} className='size-12 text-sm' />
        <div className='flex flex-col gap-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='text-2xl font-semibold tracking-tight md:text-3xl'>
              {market.baseAssetName}
            </h1>
            <Badge variant='secondary'>{market.status}</Badge>
          </div>
          <p className='text-sm text-muted-foreground uppercase'>
            {market.baseAssetTicker} / {market.quoteAssetTicker}
          </p>
          <Money value={latestPriceScaled} className='text-lg font-semibold md:text-xl' />
        </div>
      </header>

      {loadError ? (
        <Alert>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {snapshot === null ? (
        <Alert>
          <AlertDescription>
            No active account found.{' '}
            <Link href='/v2/account' className='text-primary underline'>
              Sign in or create an account
            </Link>{' '}
            to trade.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]'>
        <div className='flex flex-col gap-4'>
          <div className='rounded-2xl border border-border bg-card p-4 md:p-6'>
            <MarketPriceChart
              variant={useModelChart ? 'model' : 'trade'}
              rows={chartRows}
              timespan={chartTimespan}
              windowEndMs={nowMs}
              onTimespanChange={setChartTimespan}
              upColor={CHART_UP_COLOR}
              downColor={CHART_DOWN_COLOR}
              emptyMessage={
                useModelChart
                  ? 'No model price history yet for this market.'
                  : 'No trade price history yet for this market.'
              }
            />
          </div>

          {tablePoints.length > 0 ? (
            <div className='rounded-2xl border border-border bg-card p-4'>
              <h2 className='mb-3 text-sm font-semibold'>Recent prints</h2>
              <ul className='flex max-h-48 flex-col gap-1 overflow-y-auto'>
                {[...tablePoints]
                  .slice(-10)
                  .reverse()
                  .map((p, idx) => (
                    <li
                      key={`${p.createdAtIso}-${idx}`}
                      className='flex items-baseline justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-secondary'
                    >
                      <Money value={p.priceScaled} className='font-medium' />
                      <span className='text-xs text-muted-foreground tabular-nums'>
                        {new Date(p.createdAtIso).toLocaleString()}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {shouldShowAnalystSummary ? (
            <ValuationSummaryCard
              summary={valuationSummary}
              isLoading={isValuationSummaryLoading}
              error={valuationSummaryError}
            />
          ) : null}
        </div>

        <TradeTicket
          actionTab={actionTab}
          onActionTabChange={setActionTab}
          liquidityAmountDollars={liquidityAmountDollars}
          onLiquidityAmountChange={setLiquidityAmountDollars}
          onProvideLiquidity={handleProvideLiquidity}
          isLiquiditySubmitting={isLiquiditySubmitting}
          tradeSide={tradeSide}
          onTradeSideChange={setTradeSide}
          tradePrice={tradePrice}
          onTradePriceChange={(value) => {
            setTradePriceDirty(true);
            setTradePrice(value);
          }}
          tradePricePlaceholder={defaultTradePriceInput}
          tradeQuantity={tradeQuantity}
          onTradeQuantityChange={setTradeQuantity}
          tradeStopLoss={tradeStopLoss}
          onTradeStopLossChange={setTradeStopLoss}
          tradeExpiresAt={tradeExpiresAt}
          onTradeExpiresAtChange={setTradeExpiresAt}
          onPlaceTrade={handlePlaceTrade}
          isTradeSubmitting={isTradeSubmitting}
          isTradeDisabled={isTradeDisabled}
          tradeDisabledReason={tradeDisabledReason}
          hasAccount={snapshot !== null}
        />
      </div>

      <Button variant='ghost' className='w-fit' render={<Link href='/v2/invest' />}>
        Back to markets
      </Button>
    </section>
  );
}
// end of LLM written Code
