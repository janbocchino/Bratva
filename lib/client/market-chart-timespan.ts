// beginning of LLM written Code, Model: Claude Opus 4.5
/** User-selected window; `max` = no lower bound beyond available points (per active series variant). */
export type ChartTimespan = '1d' | '1w' | '1m' | 'max';

const MS_DAY = 86_400_000;
const MS_WEEK = 7 * MS_DAY;
const MS_MONTH = 30 * MS_DAY;

/** Keep ~1s live samples for chart buffer (covers max span + slack). */
export const CHART_LIVE_BUFFER_MS = 40 * MS_DAY;

/** Cap live 1 Hz samples so React state stays bounded (server series covers older history). */
export const MAX_LIVE_CHART_SAMPLES = 86_400;

/** Target tick count for fixed-window X-axes (avoids 86k+ DOM nodes per day of span). */
export const CHART_X_AXIS_MAX_TICKS = 100;

const NICE_AXIS_STEP_MS = [
  1_000, 5_000, 10_000, 15_000, 30_000, 60_000, 300_000, 600_000, 900_000, 1_800_000, 3_600_000,
  7_200_000, 10_800_000, 21_600_000, 43_200_000, MS_DAY,
] as const;

function niceAxisStepMs(spanMs: number, maxTicks: number): number {
  const raw = Math.max(spanMs / maxTicks, 1);
  for (const step of NICE_AXIS_STEP_MS) {
    if (step >= raw) return step;
  }
  return Math.ceil(raw / MS_DAY) * MS_DAY;
}

export function chartTimespanToStartMs(nowMs: number, span: ChartTimespan): number | null {
  if (span === 'max') return null;
  if (span === '1d') return nowMs - MS_DAY;
  if (span === '1w') return nowMs - MS_WEEK;
  return nowMs - MS_MONTH;
}

export type ChartPoint = {
  tMs: number;
  priceScaled: string;
};

/** Keep points with `tMs >= startMs`; if `startMs` is null, keep all (max). */
export function filterPointsByTimespan(
  points: readonly ChartPoint[],
  nowMs: number,
  span: ChartTimespan,
): ChartPoint[] {
  const startMs = chartTimespanToStartMs(nowMs, span);
  if (startMs === null) return [...points];
  return points.filter((p) => p.tMs >= startMs && p.tMs <= nowMs);
}

/** Chart source per explore plan: model_price vs price_series. */
export function shouldUseModelPriceChart(
  status: 'closed' | 'pending' | 'active',
  wasPreviouslyActive: boolean,
): boolean {
  return status === 'closed' || (status === 'pending' && !wasPreviouslyActive);
}

/** Merge DB samples with client 1 Hz ticks; sort by time; drop duplicate consecutive (tMs, price). */
/**
 * Bounded X-axis ticks using “nice” step sizes so Recharts does not render one tick per second
 * across multi-day windows.
 */
export function buildXAxisTicks(
  startMs: number,
  endMs: number,
  maxTicks: number = CHART_X_AXIS_MAX_TICKS,
): number[] {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return [];
  if (startMs === endMs) return [startMs];
  const span = endMs - startMs;
  const step = niceAxisStepMs(span, maxTicks);
  const ticks: number[] = [];
  const first = Math.ceil(startMs / step) * step;
  for (let t = first; t <= endMs; t += step) {
    ticks.push(t);
  }
  if (ticks.length === 0) return [startMs, endMs];
  if (ticks[0] > startMs) ticks.unshift(startMs);
  const last = ticks[ticks.length - 1];
  if (last !== undefined && last < endMs) ticks.push(endMs);
  return ticks;
}

export function mergeServerAndLiveSecondPoints(
  serverPoints: readonly ChartPoint[],
  livePoints: readonly ChartPoint[],
): ChartPoint[] {
  const all = [...serverPoints, ...livePoints].sort((a, b) => a.tMs - b.tMs);
  const out: ChartPoint[] = [];
  for (const p of all) {
    if (!Number.isFinite(p.tMs)) continue;
    const prev = out[out.length - 1];
    if (prev && prev.tMs === p.tMs && prev.priceScaled === p.priceScaled) continue;
    out.push(p);
  }
  return out;
}
// end of LLM written Code
