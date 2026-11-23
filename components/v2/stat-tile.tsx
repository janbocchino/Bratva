// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
import { cn } from '@/lib/utils';

type StatTileProps = {
  label: string;
  value: React.ReactNode;
  className?: string;
};

export function StatTile({ label, value, className }: StatTileProps) {
  return (
    <div className={cn('flex flex-col gap-1 rounded-2xl bg-secondary p-4', className)}>
      <span className='text-xs text-muted-foreground'>{label}</span>
      <div className='text-sm font-semibold tabular-nums'>{value}</div>
    </div>
  );
}
// end of LLM written Code
