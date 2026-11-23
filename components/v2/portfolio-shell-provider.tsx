// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppShell } from '@/components/v2/app-shell';
import { buildPortfolioSummary } from '@/lib/client/portfolio-valuation';
import { getAccount } from '@/lib/server/actions/get-account';
import { listMarkets } from '@/lib/server/actions/list-markets';

type PortfolioShellContextValue = {
  portfolioUsdScaled: bigint | null;
  refreshPortfolio: () => Promise<void>;
};

const PortfolioShellContext = createContext<PortfolioShellContextValue>({
  portfolioUsdScaled: null,
  refreshPortfolio: async () => {},
});

export function usePortfolioShell(): PortfolioShellContextValue {
  return useContext(PortfolioShellContext);
}

export function PortfolioShellProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [portfolioUsdScaled, setPortfolioUsdScaled] = useState<bigint | null>(null);

  const refreshPortfolio = useCallback(async () => {
    const [account, markets] = await Promise.all([getAccount(), listMarkets()]);
    if (account === null) {
      setPortfolioUsdScaled(null);
      return;
    }
    const summary = buildPortfolioSummary(account, markets);
    setPortfolioUsdScaled(summary.totalUsdScaled);
  }, []);

  useEffect(() => {
    void refreshPortfolio();
  }, [refreshPortfolio]);

  return (
    <PortfolioShellContext.Provider value={{ portfolioUsdScaled, refreshPortfolio }}>
      <AppShell portfolioUsdScaled={portfolioUsdScaled}>{children}</AppShell>
    </PortfolioShellContext.Provider>
  );
}
// end of LLM written Code
