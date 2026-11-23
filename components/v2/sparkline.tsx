// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
/*
Decision questionnaire
- Inline sparkline implementation?
  - [x] Minimal SVG polyline — no extra chart dependency for list rows.
  - [ ] Recharts sparkline (heavier).
*/
type SparklineProps = {
  values: readonly number[];
  positive?: boolean;
  className?: string;
};

export function Sparkline({ values, positive = true, className }: SparklineProps) {
  if (values.length < 2) {
    return (
      <svg
        viewBox='0 0 100 32'
        className={className}
        aria-hidden
        role='img'
        aria-label='Sparkline placeholder'
      />
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 32 - ((v - min) / range) * 28 - 2;
      return `${x},${y}`;
    })
    .join(' ');

  const stroke = positive ? 'var(--color-primary)' : 'var(--color-destructive)';

  return (
    <svg
      viewBox='0 0 100 32'
      preserveAspectRatio='none'
      className={className}
      aria-hidden
      role='img'
      aria-label='Price sparkline'
    >
      <polyline
        fill='none'
        stroke={stroke}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        points={points}
      />
    </svg>
  );
}
// end of LLM written Code
