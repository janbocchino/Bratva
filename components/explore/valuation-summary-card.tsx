// beginning of LLM written Code, Model: GPT-5.2
import { useMemo } from 'react';
import type { AssetValuationSummary } from '@/lib/server/actions/get-asset-valuation-summary';

export function ValuationSummaryCard(p: {
  summary: AssetValuationSummary | null;
  isLoading: boolean;
  error: string;
}) {
  const updatedLabel = useMemo(() => {
    if (p.summary === null) return '';
    const dt = new Date(p.summary.createdAtIso);
    return Number.isFinite(dt.getTime()) ? dt.toLocaleString() : '';
  }, [p.summary]);

  return (
    <section className='flex flex-col gap-3 rounded-lg border border-black/10 p-4'>
      <h2 className='text-lg font-medium'>Analyst summary</h2>
      {p.error ? <p className='text-sm text-red-700'>{p.error}</p> : null}
      {p.isLoading ? <p className='text-sm text-black/70'>Loading summary…</p> : null}
      {!p.isLoading && p.summary === null ? (
        <p className='text-sm text-black/70'>Summary generating…</p>
      ) : null}
      {p.summary !== null ? (
        <p className='whitespace-pre-wrap text-sm leading-relaxed text-black/80'>{p.summary.body}</p>
      ) : null}
      {p.summary !== null && updatedLabel ? (
        <p className='text-xs text-black/50'>Updated {updatedLabel}</p>
      ) : null}
    </section>
  );
}
// end of LLM written Code

