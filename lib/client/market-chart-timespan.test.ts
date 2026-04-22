// beginning of LLM written Code, Model: gpt-5.3-codex
import {
  buildXAxisTicks,
  mergeServerAndLiveSecondPoints,
} from '@/lib/client/market-chart-timespan';

describe('buildXAxisTicks', () => {
  it('returns monotonic ticks within [startMs, endMs] with bounded count', () => {
    const start = 0;
    const end = 5_000;
    const ticks = buildXAxisTicks(start, end, 100);
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.length).toBeLessThanOrEqual(102);
    expect(ticks[0]).toBe(start);
    expect(ticks[ticks.length - 1]).toBe(end);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]).toBeGreaterThanOrEqual(ticks[i - 1]!);
    }
  });

  it('does not emit one tick per second for a day-long span', () => {
    const MS_DAY = 86_400_000;
    const ticks = buildXAxisTicks(0, MS_DAY, 100);
    expect(ticks.length).toBeLessThan(150);
    expect(ticks.length).toBeGreaterThan(2);
  });
});

describe('mergeServerAndLiveSecondPoints', () => {
  it('sorts by time and drops duplicate consecutive identical points', () => {
    const merged = mergeServerAndLiveSecondPoints(
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
