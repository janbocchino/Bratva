// beginning of LLM written Code, Model: Claude Opus 4.5
/*
Decision questionnaire
- Full shadcn registry `chart.tsx` or minimal wrapper?
  - [x] Minimal `ChartContainer` + `ChartConfig` type so explore uses the same API shape as shadcn chart docs (Recharts inside).
  - [ ] Full registry chart (blocked: CLI dependency step hung).
*/
'use client';

import type * as React from 'react';
import { cn } from '@/lib/utils';

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

export function ChartContainer({
  className,
  children,
  config: _config,
  ...props
}: React.ComponentProps<'div'> & { config: ChartConfig; children: React.ReactNode }) {
  return (
    <div
      data-slot='chart'
      className={cn(
        '[&_.recharts-cartesian-axis-tick_text]:fill-neutral-500 flex aspect-auto w-full justify-center text-xs [&_.recharts-cartesian-grid_line]:stroke-neutral-200 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-neutral-300 [&_.recharts-layer]:outline-none [&_.recharts-dot]:stroke-transparent',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
// end of LLM written Code
