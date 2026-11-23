// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
import { formatUsdFromScaledQuote } from '@/lib/client/format-scaled-usd';
import { cn } from '@/lib/utils';

type MoneyProps = {
  value: bigint | string;
  displayDecimals?: number;
  className?: string;
};

export function Money({ value, displayDecimals = 2, className }: MoneyProps) {
  return (
    <span className={cn('font-mono tabular-nums', className)}>
      {formatUsdFromScaledQuote(value, displayDecimals)}
    </span>
  );
}

type PercentChangeProps = {
  value: number;
  className?: string;
};

export function PercentChange({ value, className }: PercentChangeProps) {
  const label = `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  return (
    <span
      className={cn(
        'font-mono tabular-nums text-sm font-medium',
        value >= 0 ? 'text-primary' : 'text-destructive',
        className,
      )}
    >
      {label}
    </span>
  );
}
// end of LLM written Code
