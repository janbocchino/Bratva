// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
import { ArrowDownRightIcon, ArrowUpRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChangeBadgeProps = {
  value: number;
  className?: string;
};

export function ChangeBadge({ value, className }: ChangeBadgeProps) {
  const isUp = value >= 0;
  const Icon = isUp ? ArrowUpRightIcon : ArrowDownRightIcon;
  const label = `${isUp ? '+' : ''}${value.toFixed(2)}%`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
        isUp ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive',
        className,
      )}
    >
      <Icon className='size-3.5' aria-hidden />
      {label}
    </span>
  );
}
// end of LLM written Code
