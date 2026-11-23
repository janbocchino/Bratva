// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
'use client';

import { PortfolioShellProvider } from '@/components/v2/portfolio-shell-provider';

export default function V2MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PortfolioShellProvider>{children}</PortfolioShellProvider>;
}
// end of LLM written Code
