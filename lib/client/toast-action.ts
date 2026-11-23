// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
import { toast } from 'sonner';
import { formatActionError } from '@/lib/client/format-action-error';

export function toastActionError(error: unknown, fallback: string): void {
  toast.error(formatActionError(error, fallback));
}

export function toastActionSuccess(message: string): void {
  toast.success(message);
}
// end of LLM written Code
