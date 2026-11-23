// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
/*
Decision questionnaire
- Where should v2 navigation shell live?
  - [x] Shared `AppShell` — desktop sidebar + mobile bottom nav.
  - [ ] Per-page headers (rejected — inconsistent trader UX).
*/
'use client';

import { HomeIcon, LineChartIcon, ShieldIcon, UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Money } from '@/components/v2/money';
import { cn } from '@/lib/utils';

export type AppShellNavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const USER_NAV: readonly AppShellNavItem[] = [
  { href: '/v2', label: 'Home', icon: HomeIcon, exact: true },
  { href: '/v2/invest', label: 'Invest', icon: LineChartIcon },
  { href: '/v2/account', label: 'Account', icon: UserIcon },
];

const ADMIN_NAV: readonly AppShellNavItem[] = [
  { href: '/v2', label: 'User app', icon: HomeIcon },
  { href: '/v2/admin', label: 'Admin', icon: ShieldIcon, exact: true },
  { href: '/v2/account', label: 'Account', icon: UserIcon },
];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppShellProps = {
  children: React.ReactNode;
  variant?: 'user' | 'admin';
  portfolioUsdScaled?: bigint | string | null;
};

export function AppShell({ children, variant = 'user', portfolioUsdScaled = null }: AppShellProps) {
  const pathname = usePathname();
  const navItems = variant === 'admin' ? ADMIN_NAV : USER_NAV;
  const brandLabel = variant === 'admin' ? 'huzzdaq admin' : 'huzzdaq';

  return (
    <div className='flex min-h-dvh flex-col md:flex-row'>
      <aside className='hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex'>
        <div className='flex flex-col gap-8 px-6 py-8'>
          <Link href='/v2' className='text-xl font-semibold tracking-tight text-primary'>
            {brandLabel}
          </Link>
          <nav className='flex flex-col gap-1'>
            {navItems.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(pathname, href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <Icon className='size-5' />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        {variant === 'user' && portfolioUsdScaled !== null ? (
          <div className='mt-auto border-t border-border p-6'>
            <p className='text-xs text-muted-foreground'>Portfolio value</p>
            <Money value={portfolioUsdScaled} className='text-lg font-semibold' />
          </div>
        ) : null}
      </aside>

      <div className='flex min-h-dvh flex-1 flex-col'>
        <main className='mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-28 pt-8 md:px-10 md:pb-10 md:pt-10'>
          {children}
        </main>
      </div>

      <nav className='fixed inset-x-0 bottom-0 z-50 m-4 rounded-2xl border border-border bg-card/90 backdrop-blur-xl md:hidden'>
        <ul className='flex items-stretch justify-around px-2 py-2'>
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(pathname, href, exact);
            return (
              <li key={href} className='flex-1'>
                <Link
                  href={href}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icon className='size-5' />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
// end of LLM written Code
