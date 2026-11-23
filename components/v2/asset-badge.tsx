// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
import { cn } from '@/lib/utils';

type AssetBadgeProps = {
  ticker: string;
  className?: string;
};

export function AssetBadge({ ticker, className }: AssetBadgeProps) {
  const label = ticker.slice(0, 3).toUpperCase();
  return (
    <span
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold',
        className,
      )}
      aria-hidden
    >
      {label}
    </span>
  );
}
// end of LLM written Code
