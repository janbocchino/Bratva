// beginning of LLM written Code, Model: Claude Opus 4.7
/*
Decision questionnaire
- Where does Recharts + timespan UI live?
  - [x] `components/explore/market-price-chart.tsx` — keeps `app/explore/[publicId]/page.tsx` thinner.
  - [ ] Inline only in the page file.
- Line vs area vs candles?
  - [x] AreaChart with up/down gradient (SOTA feel, frontend-only).
  - [ ] Plain LineChart (previous).
  - [ ] OHLC candles (requires server aggregation).
- Chart colors in dark v2 vs light legacy?
  - [x] Semantic tokens + optional `upColor`/`downColor` props; defaults keep legacy green/red.
  - [ ] Hardcoded literals only.
*/
'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { type ChartConfig, ChartContainer } from '@/components/ui/chart';
import {
  formatUsdFromScaledQuote,
  scaledQuoteToApproximateNumberForChart,
} from '@/lib/client/format-scaled-usd';
import {
  type ChartTimespan,
  TIMESPAN_LABEL,
  buildXAxisTicks,
  chartTimespanToStartMs,
  formatAxisTickLabel,
} from '@/lib/client/market-chart-timespan';
import { cn } from '@/lib/utils';

export type MarketChartRow = {
  tMs: number;
  priceScaled: string;
};

const TIMESPAN_ORDER: readonly ChartTimespan[] = ['1d', '1w', '1m', 'max'];

const DEFAULT_UP_COLOR = 'hsl(142 71% 40%)';
const DEFAULT_DOWN_COLOR = 'hsl(0 72% 48%)';

const chartConfig = {
  price: {
    label: 'Price',
    color: 'var(--color-foreground)',
  },
} satisfies ChartConfig;

type MarketPriceChartProps = {
  variant: 'model' | 'trade';
  rows: readonly MarketChartRow[];
  timespan: ChartTimespan;
  /** Right edge of the visible window (typically `Date.now()` from the page ticker). */
  windowEndMs: number;
  onTimespanChange: (span: ChartTimespan) => void;
  emptyMessage: string;
  upColor?: string;
  downColor?: string;
};

export function MarketPriceChart({
  variant,
  rows,
  timespan,
  windowEndMs,
  onTimespanChange,
  emptyMessage,
  upColor = DEFAULT_UP_COLOR,
  downColor = DEFAULT_DOWN_COLOR,
}: MarketPriceChartProps) {
  const data = useMemo(
    () =>
      rows.map((r) => ({
        tMs: r.tMs,
        price: scaledQuoteToApproximateNumberForChart(r.priceScaled),
        priceScaled: r.priceScaled,
      })),
    [rows],
  );

  const xDomain = useMemo((): [number, number] | [string, string] => {
    if (data.length === 0) return ['dataMin', 'dataMax'];
    if (timespan === 'max') {
      return [data[0]!.tMs, data[data.length - 1]!.tMs];
    }
    const start = chartTimespanToStartMs(windowEndMs, timespan);
    if (start === null) return ['dataMin', 'dataMax'];
    return [start, windowEndMs];
  }, [data, timespan, windowEndMs]);

  const xAxisTicks = useMemo(() => {
    if (typeof xDomain[0] === 'string') return undefined;
    return buildXAxisTicks(xDomain[0] as number, xDomain[1] as number, timespan);
  }, [xDomain, timespan]);

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const open = data[0]!.price;
    const last = data[data.length - 1]!.price;
    let min = data[0]!.price;
    let max = data[0]!.price;
    for (const d of data) {
      if (d.price < min) min = d.price;
      if (d.price > max) max = d.price;
    }
    const delta = open === 0 ? 0 : (last - open) / open;
    const isUp = last >= open;
    const latestScaled = data[data.length - 1]!.priceScaled;
    return { open, last, min, max, delta, isUp, latestScaled, range: max - min };
  }, [data]);

  const yTickFormatter = useMemo(() => {
    const range = stats?.range ?? 0;
    const maxFractionDigits = range < 0.01 ? 6 : range < 1 ? 4 : 2;
    const fmt = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: maxFractionDigits,
      minimumFractionDigits: Math.min(2, maxFractionDigits),
    });
    return (v: number) => fmt.format(Number(v));
  }, [stats?.range]);

  const headerColor = stats?.isUp ? upColor : downColor;
  const gradientId = `market-area-gradient-${variant}-${stats?.isUp ? 'up' : 'down'}`;

  if (data.length === 0 || stats === null) {
    return (
      <div className='flex flex-col gap-3'>
        <PriceHeader stats={null} color={upColor} />
        <TimespanBar timespan={timespan} onTimespanChange={onTimespanChange} />
        <p className='text-sm text-muted-foreground'>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      <PriceHeader stats={stats} color={headerColor} />
      <TimespanBar timespan={timespan} onTimespanChange={onTimespanChange} />
      <ChartContainer config={chartConfig} className='h-[min(360px,50vh)] w-full min-h-[220px]'>
        <ResponsiveContainer width='100%' height='100%'>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor={headerColor} stopOpacity={0.35} />
                <stop offset='100%' stopColor={headerColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray='3 3' className='stroke-border/50' />
            <XAxis
              dataKey='tMs'
              type='number'
              domain={xDomain}
              ticks={xAxisTicks}
              tickFormatter={(ms: number) => formatAxisTickLabel(ms, timespan)}
              tickLine={false}
              axisLine={false}
              minTickGap={16}
              height={28}
              tick={{ fontSize: 11, className: 'fill-muted-foreground' }}
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={yTickFormatter}
              tickLine={false}
              axisLine={false}
              width={72}
              tick={{ fontSize: 11, className: 'fill-muted-foreground' }}
              orientation='right'
            />
            <Tooltip
              cursor={{ className: 'stroke-border' }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const row = payload[0].payload as { tMs: number; priceScaled: string };
                return (
                  <div className='rounded-lg border border-border bg-popover px-2 py-1.5 text-xs shadow-sm'>
                    <p className='text-muted-foreground'>{new Date(row.tMs).toLocaleString()}</p>
                    <p className='font-mono font-medium tabular-nums text-foreground'>
                      {formatUsdFromScaledQuote(row.priceScaled)}
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type={variant === 'trade' ? 'stepAfter' : 'monotone'}
              dataKey='price'
              name='price'
              stroke={headerColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: headerColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}

type PriceStats = {
  open: number;
  last: number;
  min: number;
  max: number;
  delta: number;
  isUp: boolean;
  latestScaled: string;
  range: number;
};

function PriceHeader({ stats, color }: { stats: PriceStats | null; color: string }) {
  if (stats === null) {
    return (
      <div className='flex items-baseline gap-3'>
        <span className='text-2xl font-semibold tracking-tight text-muted-foreground'>—</span>
      </div>
    );
  }
  const deltaPct = stats.delta * 100;
  const deltaLabel = `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(2)}%`;
  const rangeDecimals = stats.range < 0.01 ? 6 : stats.range < 1 ? 4 : 2;
  return (
    <div className='flex flex-wrap items-baseline gap-x-4 gap-y-1'>
      <span className='text-3xl font-semibold tracking-tight tabular-nums text-foreground md:text-4xl'>
        {formatUsdFromScaledQuote(stats.latestScaled, rangeDecimals)}
      </span>
      <span className='text-sm font-medium tabular-nums' style={{ color }}>
        {deltaLabel}
      </span>
      <span className='text-xs text-muted-foreground tabular-nums'>
        Range{' '}
        {new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: rangeDecimals,
          minimumFractionDigits: Math.min(2, rangeDecimals),
        }).format(stats.min)}{' '}
        –{' '}
        {new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: rangeDecimals,
          minimumFractionDigits: Math.min(2, rangeDecimals),
        }).format(stats.max)}
      </span>
    </div>
  );
}

function TimespanBar({
  timespan,
  onTimespanChange,
}: {
  timespan: ChartTimespan;
  onTimespanChange: (span: ChartTimespan) => void;
}) {
  return (
    <fieldset className='flex flex-wrap gap-2 border-0 p-0'>
      <legend className='sr-only'>Chart time range</legend>
      {TIMESPAN_ORDER.map((value) => (
        <button
          key={value}
          type='button'
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            timespan === value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground',
          )}
          onClick={() => onTimespanChange(value)}
        >
          {TIMESPAN_LABEL[value]}
        </button>
      ))}
    </fieldset>
  );
}
// end of LLM written Code
