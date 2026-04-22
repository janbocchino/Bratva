// beginning of LLM written Code, Model: Claude Opus 4.5
/*
Decision questionnaire
- Where does Recharts + timespan UI live?
  - [x] `components/explore/market-price-chart.tsx` — keeps `app/explore/[publicId]/page.tsx` thinner.
  - [ ] Inline only in the page file.
*/
'use client';

import { type ComponentProps, useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
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
  buildXAxisTicks,
  chartTimespanToStartMs,
} from '@/lib/client/market-chart-timespan';
import { cn } from '@/lib/utils';

export type MarketChartRow = {
  tMs: number;
  priceScaled: string;
};

const TIMESPAN_OPTIONS: { value: ChartTimespan; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: 'max', label: 'Max' },
];

const chartConfig = {
  price: {
    label: 'Price',
    color: 'hsl(var(--foreground))',
  },
} satisfies ChartConfig;

type XAxisTickRenderer = NonNullable<ComponentProps<typeof XAxis>['tick']>;

type MarketPriceChartProps = {
  variant: 'model' | 'trade';
  rows: readonly MarketChartRow[];
  timespan: ChartTimespan;
  /** Right edge of the visible window (typically `Date.now()` from the page ticker). */
  windowEndMs: number;
  onTimespanChange: (span: ChartTimespan) => void;
  emptyMessage: string;
};

export function MarketPriceChart({
  variant,
  rows,
  timespan,
  windowEndMs,
  onTimespanChange,
  emptyMessage,
}: MarketPriceChartProps) {
  const data = rows.map((r) => ({
    tMs: r.tMs,
    price: scaledQuoteToApproximateNumberForChart(r.priceScaled),
    priceScaled: r.priceScaled,
  }));

  const xDomain = useMemo((): [number, number] | [string, string] => {
    if (timespan === 'max') return ['dataMin', 'dataMax'];
    const start = chartTimespanToStartMs(windowEndMs, timespan);
    if (start === null) return ['dataMin', 'dataMax'];
    return [start, windowEndMs];
  }, [timespan, windowEndMs]);

  const xAxisSpanMs = useMemo(() => {
    if (timespan === 'max' || typeof xDomain[0] === 'string') return 0;
    return (xDomain[1] as number) - (xDomain[0] as number);
  }, [timespan, xDomain]);

  /** Bounded tick count on fixed windows; labels throttled in `SecondResolutionTick`. */
  const xAxisTicks = useMemo(() => {
    if (timespan === 'max' || typeof xDomain[0] === 'string') return undefined;
    return buildXAxisTicks(xDomain[0] as number, xDomain[1] as number);
  }, [timespan, xDomain]);

  const formatTickMaxMode = (ms: number) => {
    const d = new Date(ms);
    if (timespan === '1d' || timespan === '1w') {
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (data.length === 0) {
    return (
      <div className='flex flex-col gap-3'>
        <TimespanBar timespan={timespan} onTimespanChange={onTimespanChange} />
        <p className='text-sm text-black/70'>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      <TimespanBar timespan={timespan} onTimespanChange={onTimespanChange} />
      <ChartContainer config={chartConfig} className='h-[min(360px,50vh)] w-full min-h-[200px]'>
        <ResponsiveContainer width='100%' height='100%'>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray='3 3' />
            <XAxis
              dataKey='tMs'
              type='number'
              domain={xDomain}
              interval={0}
              {...(xAxisTicks
                ? {
                    ticks: xAxisTicks,
                    minTickGap: 0,
                    tick: ((tickProps) => (
                      <SecondResolutionTick
                        x={Number(tickProps.x)}
                        y={Number(tickProps.y)}
                        payload={
                          tickProps.payload as {
                            value?: number;
                          }
                        }
                        spanMs={xAxisSpanMs}
                        timespan={timespan}
                      />
                    )) as XAxisTickRenderer,
                  }
                : {
                    tickFormatter: formatTickMaxMode,
                    minTickGap: 24,
                  })}
              height={44}
              stroke='rgba(0,0,0,0.35)'
            />
            <YAxis
              domain={['auto', 'auto']}
              tickFormatter={(v) =>
                new Intl.NumberFormat(undefined, {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 6,
                }).format(Number(v))
              }
              width={80}
              stroke='rgba(0,0,0,0.35)'
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const row = payload[0].payload as { tMs: number; priceScaled: string };
                return (
                  <div className='rounded border border-black/10 bg-white px-2 py-1.5 text-xs shadow-sm'>
                    <p className='text-black/60'>{new Date(row.tMs).toLocaleString()}</p>
                    <p className='font-medium text-black'>
                      {formatUsdFromScaledQuote(row.priceScaled)}
                    </p>
                  </div>
                );
              }}
            />
            <Line
              type={variant === 'trade' ? 'stepAfter' : 'monotone'}
              dataKey='price'
              name='price'
              stroke='#171717'
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}

const MS_DAY = 86_400_000;

function SecondResolutionTick({
  x,
  y,
  payload,
  spanMs,
  timespan,
}: {
  x: number;
  y: number;
  payload: { value?: number };
  spanMs: number;
  timespan: ChartTimespan;
}) {
  const ms = payload.value;
  if (ms === undefined || Number.isNaN(ms)) return null;
  const showText = shouldShowAxisLabel(ms, spanMs);
  const label = formatAxisTickLabel(ms, spanMs, timespan);
  return (
    <g transform={`translate(${x},${y})`}>
      <line
        x1={0}
        x2={0}
        y1={0}
        y2={5}
        stroke='rgba(0,0,0,0.28)'
        strokeWidth={0.65}
        vectorEffect='non-scaling-stroke'
      />
      {showText ? (
        <text y={20} textAnchor='middle' className='fill-black/65' fontSize={9}>
          {label}
        </text>
      ) : null}
    </g>
  );
}

function shouldShowAxisLabel(ms: number, spanMs: number): boolean {
  const d = new Date(ms);
  if (spanMs <= 20 * 60 * 1000) return d.getSeconds() === 0;
  if (spanMs <= 7 * MS_DAY) return d.getMinutes() === 0 && d.getSeconds() === 0;
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0;
}

function formatAxisTickLabel(ms: number, spanMs: number, timespan: ChartTimespan): string {
  const d = new Date(ms);
  if (spanMs <= 20 * 60 * 1000) {
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
  if (spanMs <= 48 * 60 * 60 * 1000) {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (timespan === '1m') {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
      {TIMESPAN_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type='button'
          className={cn(
            'rounded border px-3 py-1.5 text-xs font-medium',
            timespan === opt.value
              ? 'border-black bg-black text-white'
              : 'border-black/20 text-black/80',
          )}
          onClick={() => onTimespanChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </fieldset>
  );
}
// end of LLM written Code
