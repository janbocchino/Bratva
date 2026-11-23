// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
import { Toaster } from '@/components/ui/sonner';

export default function V2RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className='theme-lumen flex min-h-dvh flex-col bg-background text-foreground'>
      {children}
      <Toaster theme='dark' richColors closeButton position='top-right' />
    </div>
  );
}
// end of LLM written Code
