// beginning of LLM written Code, Model: Claude Opus 4.7
/** User-selected window; `max` = no lower bound beyond available points (per active series variant). */
export type ChartTimespan = '1d' | '1w' | '1m' | 'max';

const MS_SECOND = 1_000;
const MS_MINUTE = 60 * MS_SECOND;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;
const MS_WEEK = 7 * MS_DAY;
const MS_MONTH = 30 * MS_DAY;

/** Live sampling cadence: append one latest-price point every 5s (user spec). */
export const LIVE_TICK_INTERVAL_MS = 5_000;

/** Keep ~40 days of live samples so re-opening older windows still has dense points. */
export const CHART_LIVE_BUFFER_MS = 40 * MS_DAY;

/** Hard cap on in-memory live samples (40 days / 5s). */
export const MAX_LIVE_SAMPLES = Math.ceil(CHART_LIVE_BUFFER_MS / LIVE_TICK_INTERVAL_MS);

export const TIMESPAN_LABEL: Record<ChartTimespan, string> = {
  '1d': 'Day',
  '1w': 'Week',
  '1m': 'Month',
  max: 'Max',
};

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

/** Midnight (local time) on or after `ms`. */
function ceilToLocalMidnight(ms: number): number {
  const d = new Date(ms);
  if (
    d.getHours() === 0 &&
    d.getMinutes() === 0 &&
    d.getSeconds() === 0 &&
    d.getMilliseconds() === 0
  ) {
    return ms;
  }
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

/** First-of-month (local time) on or after `ms`. */
function ceilToLocalMonthStart(ms: number): number {
  const d = new Date(ms);
  if (
    d.getDate() === 1 &&
    d.getHours() === 0 &&
    d.getMinutes() === 0 &&
    d.getSeconds() === 0 &&
    d.getMilliseconds() === 0
  ) {
    return ms;
  }
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0).getTime();
}

/** Add `n` whole months to `ms`, preserving local time-of-day. */
function addMonths(ms: number, n: number): number {
  const d = new Date(ms);
  return new Date(
    d.getFullYear(),
    d.getMonth() + n,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  ).getTime();
}

/** 4-hour local slot on or after `ms` (slots at 00, 04, 08, 12, 16, 20). */
function ceilToLocal4hSlot(ms: number): number {
  const d = new Date(ms);
  const slotHour = Math.ceil(d.getHours() / 4) * 4;
  const aligned = new Date(d);
  aligned.setHours(slotHour, 0, 0, 0);
  if (aligned.getTime() < ms) aligned.setHours(aligned.getHours() + 4);
  return aligned.getTime();
}

function stepByFixedMs(startMs: number, endMs: number, stepMs: number, firstMs: number): number[] {
  const out: number[] = [];
  for (let t = firstMs; t <= endMs; t += stepMs) {
    if (t >= startMs) out.push(t);
  }
  return out;
}

/**
 * Per-span, anchored x-axis ticks. Aims for ~6–8 labels regardless of window so the
 * axis is always readable and never "bulked" with per-second ticks.
 */
export function buildXAxisTicks(startMs: number, endMs: number, span: ChartTimespan): number[] {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return [];
  if (startMs === endMs) return [startMs];

  if (span === '1d') {
    return stepByFixedMs(startMs, endMs, 4 * MS_HOUR, ceilToLocal4hSlot(startMs));
  }
  if (span === '1w') {
    return stepByFixedMs(startMs, endMs, MS_DAY, ceilToLocalMidnight(startMs));
  }
  if (span === '1m') {
    return stepByFixedMs(startMs, endMs, 5 * MS_DAY, ceilToLocalMidnight(startMs));
  }

  // max: choose step so span/step lands in ~[6, 10].
  const spanMs = endMs - startMs;
  if (spanMs <= 10 * MS_DAY) {
    return stepByFixedMs(startMs, endMs, MS_DAY, ceilToLocalMidnight(startMs));
  }
  if (spanMs <= 10 * MS_WEEK) {
    return stepByFixedMs(startMs, endMs, MS_WEEK, ceilToLocalMidnight(startMs));
  }

  // Monthly step; iterate with addMonths to avoid DST/month-length drift.
  const out: number[] = [];
  const totalMonths = Math.max(1, Math.round(spanMs / MS_MONTH));
  const monthStep = Math.max(1, Math.ceil(totalMonths / 8));
  let t = ceilToLocalMonthStart(startMs);
  while (t <= endMs) {
    if (t >= startMs) out.push(t);
    t = addMonths(t, monthStep);
  }
  return out;
}

export function formatAxisTickLabel(ms: number, span: ChartTimespan): string {
  const d = new Date(ms);
  if (span === '1d') {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  if (span === '1w') {
    return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit' });
  }
  if (span === '1m') {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  // Year boundary inside the label makes max-mode readable across years.
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

/** Merge DB samples with client live ticks; sort by time; drop duplicate consecutive (tMs, price). */
export function mergeServerAndLiveTickPoints(
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
