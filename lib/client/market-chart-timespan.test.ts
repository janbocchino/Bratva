// beginning of LLM written Code, Model: Claude Opus 4.7
import {
  buildXAxisTicks,
  mergeServerAndLiveTickPoints,
} from '@/lib/client/market-chart-timespan';

const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;
const MS_WEEK = 7 * MS_DAY;

function localMidnightBefore(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

describe('buildXAxisTicks — 1d (Day)', () => {
  it('emits ~6 ticks aligned to 4h local slots', () => {
    const end = new Date(2026, 3, 23, 14, 37, 12).getTime();
    const start = end - MS_DAY;
    const ticks = buildXAxisTicks(start, end, '1d');
    expect(ticks.length).toBeGreaterThanOrEqual(5);
    expect(ticks.length).toBeLessThanOrEqual(8);
    for (const t of ticks) {
      const d = new Date(t);
      expect(d.getHours() % 4).toBe(0);
      expect(d.getMinutes()).toBe(0);
      expect(d.getSeconds()).toBe(0);
      expect(t).toBeGreaterThanOrEqual(start);
      expect(t).toBeLessThanOrEqual(end);
    }
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]! - ticks[i - 1]!).toBe(4 * MS_HOUR);
    }
  });
});

describe('buildXAxisTicks — 1w (Week)', () => {
  it('emits 7 daily ticks at local midnight', () => {
    const end = new Date(2026, 3, 23, 14, 0, 0).getTime();
    const start = end - MS_WEEK;
    const ticks = buildXAxisTicks(start, end, '1w');
    expect(ticks.length).toBeGreaterThanOrEqual(6);
    expect(ticks.length).toBeLessThanOrEqual(8);
    for (const t of ticks) {
      expect(t).toBe(localMidnightBefore(t));
    }
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]! - ticks[i - 1]!).toBe(MS_DAY);
    }
  });
});

describe('buildXAxisTicks — 1m (Month)', () => {
  it('emits ticks at local midnight on a 5-day step', () => {
    const end = new Date(2026, 3, 23, 9, 0, 0).getTime();
    const start = end - 30 * MS_DAY;
    const ticks = buildXAxisTicks(start, end, '1m');
    expect(ticks.length).toBeGreaterThanOrEqual(5);
    expect(ticks.length).toBeLessThanOrEqual(8);
    for (const t of ticks) {
      expect(t).toBe(localMidnightBefore(t));
    }
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]! - ticks[i - 1]!).toBe(5 * MS_DAY);
    }
  });
});

describe('buildXAxisTicks — max', () => {
  it('picks a bounded number of ticks for a year-long span', () => {
    const end = new Date(2026, 3, 23).getTime();
    const start = new Date(2025, 3, 23).getTime();
    const ticks = buildXAxisTicks(start, end, 'max');
    expect(ticks.length).toBeGreaterThan(2);
    expect(ticks.length).toBeLessThan(20);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]!).toBeGreaterThan(ticks[i - 1]!);
    }
    expect(ticks[0]).toBeGreaterThanOrEqual(start);
    expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(end);
  });

  it('returns [] on inverted range', () => {
    expect(buildXAxisTicks(1000, 500, 'max')).toEqual([]);
  });
});

describe('mergeServerAndLiveTickPoints', () => {
  it('sorts by time and drops duplicate consecutive identical points', () => {
    const merged = mergeServerAndLiveTickPoints(
      [
        { tMs: 2000, priceScaled: '2' },
        { tMs: 0, priceScaled: '1' },
      ],
      [
        { tMs: 1000, priceScaled: '1' },
        { tMs: 1000, priceScaled: '1' },
      ],
    );
    expect(merged.map((p) => p.tMs)).toEqual([0, 1000, 2000]);
    expect(merged).toHaveLength(3);
  });
});
// end of LLM written Code
