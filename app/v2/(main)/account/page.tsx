'use client';
// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Money } from '@/components/v2/money';
import { usePortfolioShell } from '@/components/v2/portfolio-shell-provider';
import type { AccountHistoryEntry } from '@/domain/aggregates/account-history';
import type { LedgerUnits } from '@/domain/aggregates/ledger';
import type { AssetId } from '@/domain/values/asset';
import { formatTokenAmount } from '@/domain/values/format-fixed-point';
import { UserDisplayName, UserEmail } from '@/domain/values/user';
import { formatUsdFromScaledQuote } from '@/lib/client/format-scaled-usd';
import { toastActionError, toastActionSuccess } from '@/lib/client/toast-action';
import { addBalance } from '@/lib/server/actions/add-balance';
import { cancelOrder } from '@/lib/server/actions/cancel-order';
import { createUser } from '@/lib/server/actions/create-user';
import type { AccountSnapshot } from '@/lib/server/actions/get-account';
import { getAccount } from '@/lib/server/actions/get-account';
import { signIn } from '@/lib/server/actions/sign-in';
import { withdrawBalance } from '@/lib/server/actions/withdraw-balance';

/*
Decision questionnaire
- How should v2 account errors surface?
  - [x] `sonner` toasts via `toastActionError` / `toastActionSuccess` — no inline-only status text.
  - [ ] Inline `<p>` only (legacy pattern).
*/

const asBigInt = (amount: bigint | string): bigint =>
  typeof amount === 'bigint' ? amount : BigInt(amount);

const isUsdLedgerAsset = (assetId: AssetId | number, usdAssetId: AssetId | null): boolean =>
  usdAssetId !== null && Number(assetId) === Number(usdAssetId);

const formatLedgerAmount = (
  amount: bigint | string,
  units: LedgerUnits,
  assetId: AssetId | number,
  usdAssetId: AssetId | null,
): string => {
  const raw = asBigInt(amount);
  if (units === 'cent' || isUsdLedgerAsset(assetId, usdAssetId)) {
    return formatUsdFromScaledQuote(raw);
  }
  return formatTokenAmount(raw);
};

const ledgerUnitsLabel = (
  units: LedgerUnits,
  assetId: AssetId | number,
  usdAssetId: AssetId | null,
): string => {
  if (isUsdLedgerAsset(assetId, usdAssetId)) return 'USD';
  if (units === 'scaled_unit') return 'Token (scaled)';
  if (units === 'cent') return 'USD (legacy)';
  return 'Unit';
};

const historyDateLabel = (entry: AccountHistoryEntry): string => {
  if (!entry.hasAccurateTimestamp) return 'timestamp unavailable';
  const date = new Date(entry.occurredAtIso);
  return Number.isNaN(date.getTime()) ? 'timestamp unavailable' : date.toLocaleString();
};

export default function V2AccountPage() {
  const { refreshPortfolio } = usePortfolioShell();
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [amountDollars, setAmountDollars] = useState('10.00');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [balanceAction, setBalanceAction] = useState<'idle' | 'add' | 'withdraw'>('idle');
  const [isCreating, setIsCreating] = useState(false);
  const [authMode, setAuthMode] = useState<'signIn' | 'createAccount'>('signIn');
  const [signInEmail, setSignInEmail] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [cancelingOrderId, setCancelingOrderId] = useState<number | null>(null);

  const refreshAccount = useCallback(async () => {
    setIsLoading(true);
    const account = await getAccount();
    setSnapshot(account);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refreshAccount();
  }, [refreshAccount]);

  const handleAddBalance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!snapshot) return;

    setBalanceAction('add');
    try {
      await addBalance({ amountDollars });
      await refreshAccount();
      await refreshPortfolio();
      toastActionSuccess('Balance added.');
    } catch (error) {
      toastActionError(error, 'Failed to add balance.');
    } finally {
      setBalanceAction('idle');
    }
  };

  const handleWithdrawBalance = async () => {
    if (!snapshot) return;

    setBalanceAction('withdraw');
    try {
      await withdrawBalance({ amountDollars });
      await refreshAccount();
      await refreshPortfolio();
      toastActionSuccess('Withdrawn.');
    } catch (error) {
      toastActionError(error, 'Failed to withdraw balance.');
    } finally {
      setBalanceAction('idle');
    }
  };

  const handleCancelOrder = async (orderId: number, orderPublicId: string) => {
    if (!snapshot) return;
    setCancelingOrderId(orderId);
    try {
      await cancelOrder({ orderId });
      await refreshAccount();
      toastActionSuccess(`Order ${orderPublicId} cancelled.`);
    } catch (error) {
      toastActionError(error, 'Failed to cancel order.');
    } finally {
      setCancelingOrderId(null);
    }
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSigningIn(true);
    try {
      const user = await signIn({ email: UserEmail(signInEmail) });
      setSignInEmail('');
      await refreshAccount();
      await refreshPortfolio();
      toastActionSuccess(`Signed in as ${user.displayName}.`);
    } catch (error) {
      toastActionError(error, 'Failed to sign in.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreating(true);
    try {
      const createdUser = await createUser({
        displayName: UserDisplayName(displayName),
        email: UserEmail(email),
      });
      setDisplayName('');
      setEmail('');
      await refreshAccount();
      await refreshPortfolio();
      toastActionSuccess(`Account created for ${createdUser.displayName}.`);
    } catch (error) {
      toastActionError(error, 'Failed to create account.');
    } finally {
      setIsCreating(false);
    }
  };

  const historyByCategory = snapshot?.history.entries.reduce(
    (acc, entry) => {
      if (entry.category === 'balanceEdit') acc.balanceEdit.push(entry);
      if (entry.category === 'trade') acc.trade.push(entry);
      if (entry.category === 'liquidityProvided') acc.liquidityProvided.push(entry);
      if (entry.category === 'legacy') acc.legacy.push(entry);
      return acc;
    },
    {
      balanceEdit: [] as AccountHistoryEntry[],
      trade: [] as AccountHistoryEntry[],
      liquidityProvided: [] as AccountHistoryEntry[],
      legacy: [] as AccountHistoryEntry[],
    },
  );

  if (isLoading) {
    return (
      <section className='flex flex-col gap-4'>
        <Skeleton className='h-10 w-48' />
        <Skeleton className='h-40 w-full' />
      </section>
    );
  }

  if (!snapshot) {
    return (
      <section className='flex flex-col gap-6'>
        <header className='flex flex-col gap-1'>
          <h1 className='text-2xl font-semibold tracking-tight md:text-3xl'>Account</h1>
          <p className='text-sm text-muted-foreground'>
            Sign in or create an account to start funding and trading.
          </p>
        </header>

        <Tabs
          value={authMode}
          onValueChange={(value) => setAuthMode(value as 'signIn' | 'createAccount')}
        >
          <TabsList>
            <TabsTrigger value='signIn'>Sign in</TabsTrigger>
            <TabsTrigger value='createAccount'>Create account</TabsTrigger>
          </TabsList>

          <TabsContent value='signIn'>
            <Card className='rounded-2xl border-border bg-card shadow-none'>
              <CardHeader>
                <CardTitle>Sign in</CardTitle>
                <CardDescription>Enter the email for your existing account.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor='sign-in-email'>Email</FieldLabel>
                      <Input
                        id='sign-in-email'
                        type='email'
                        value={signInEmail}
                        onChange={(event) => setSignInEmail(event.target.value)}
                        required
                      />
                    </Field>
                    <Button type='submit' disabled={isSigningIn}>
                      {isSigningIn ? 'Signing in…' : 'Sign in'}
                    </Button>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='createAccount'>
            <Card className='rounded-2xl border-border bg-card shadow-none'>
              <CardHeader>
                <CardTitle>Create account</CardTitle>
                <CardDescription>Set up a new trading account.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateUser}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor='display-name'>Display name</FieldLabel>
                      <Input
                        id='display-name'
                        type='text'
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor='create-email'>Email</FieldLabel>
                      <Input
                        id='create-email'
                        type='email'
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                      />
                    </Field>
                    <Button type='submit' disabled={isCreating}>
                      {isCreating ? 'Creating…' : 'Create account'}
                    </Button>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    );
  }

  return (
    <section className='flex flex-col gap-8'>
      <header className='flex flex-col gap-1'>
        <h1 className='text-2xl font-semibold tracking-tight md:text-3xl'>Account</h1>
        <p className='text-sm text-muted-foreground'>Profile, balances, and ledger overview.</p>
      </header>

      <Card className='rounded-2xl border-border bg-card shadow-none'>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className='grid gap-4 text-sm sm:grid-cols-2'>
            <div>
              <dt className='text-muted-foreground'>Display name</dt>
              <dd className='font-medium'>{snapshot.user.displayName}</dd>
            </div>
            <div>
              <dt className='text-muted-foreground'>Email</dt>
              <dd className='font-medium'>{snapshot.user.email}</dd>
            </div>
            <div>
              <dt className='text-muted-foreground'>Role</dt>
              <dd>
                <Badge variant='secondary'>{snapshot.user.role}</Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className='rounded-2xl border-border bg-card shadow-none'>
        <CardHeader>
          <CardTitle>Balance</CardTitle>
          <CardDescription>Add or withdraw USD from your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddBalance}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor='balance-amount'>Amount (USD)</FieldLabel>
                <Input
                  id='balance-amount'
                  type='text'
                  value={amountDollars}
                  onChange={(event) => setAmountDollars(event.target.value)}
                />
              </Field>
              <div className='flex flex-wrap gap-2'>
                <Button type='submit' disabled={balanceAction !== 'idle'}>
                  {balanceAction === 'add' ? 'Adding…' : 'Add balance'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  disabled={balanceAction !== 'idle'}
                  onClick={() => void handleWithdrawBalance()}
                >
                  {balanceAction === 'withdraw' ? 'Withdrawing…' : 'Withdraw'}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card className='rounded-2xl border-border bg-card shadow-none'>
        <CardHeader>
          <CardTitle>Open orders</CardTitle>
        </CardHeader>
        <CardContent>
          {snapshot.openOrders.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No open orders.</p>
          ) : (
            <ul className='flex flex-col gap-3'>
              {snapshot.openOrders.map((order) => {
                const sideLabel = order.side === 'bid' ? 'Buy' : 'Sell';
                const tickerPair =
                  order.baseAssetTicker && order.quoteAssetTicker
                    ? `${order.baseAssetTicker.toUpperCase()} / ${order.quoteAssetTicker.toUpperCase()}`
                    : `market ${order.marketPublicId}`;
                const isCanceling = cancelingOrderId === order.id;
                return (
                  <li
                    key={order.publicId}
                    className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2'
                  >
                    <div className='flex flex-col gap-0.5'>
                      <p className='font-medium'>
                        {sideLabel} {tickerPair}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {order.publicId} · price{' '}
                        <Money value={asBigInt(order.priceScaled)} className='inline' /> · qty{' '}
                        {formatTokenAmount(asBigInt(order.quantityScaled))} · filled{' '}
                        {formatTokenAmount(asBigInt(order.filledScaled))}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        placed {new Date(order.createdAtIso).toLocaleString()} · expires{' '}
                        {new Date(order.expiresAtIso).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => void handleCancelOrder(order.id, order.publicId)}
                      disabled={isCanceling || cancelingOrderId !== null}
                    >
                      {isCanceling ? 'Cancelling…' : 'Cancel'}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className='rounded-2xl border-border bg-card shadow-none'>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='overflow-hidden rounded-lg border border-border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.ledger.summary.map((balance) => (
                  <TableRow key={`${balance.assetId}-${balance.units}`}>
                    <TableCell>
                      {ledgerUnitsLabel(balance.units, balance.assetId, snapshot.usdAssetId)}
                    </TableCell>
                    <TableCell className='text-muted-foreground'>{balance.units}</TableCell>
                    <TableCell className='font-mono tabular-nums'>
                      {isUsdLedgerAsset(balance.assetId, snapshot.usdAssetId) ? (
                        <Money value={balance.balance as bigint | string} />
                      ) : (
                        formatLedgerAmount(
                          balance.balance as bigint | string,
                          balance.units,
                          balance.assetId,
                          snapshot.usdAssetId,
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className='rounded-2xl border-border bg-card shadow-none'>
        <CardHeader>
          <CardTitle>Ledger history</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-6 text-sm'>
          <section>
            <h3 className='mb-2 font-semibold'>Balance edits</h3>
            <ul className='flex flex-col gap-2'>
              {historyByCategory?.balanceEdit.map((entry) => {
                if (entry.category !== 'balanceEdit') return null;
                return (
                  <li
                    key={entry.id}
                    className='flex items-center justify-between rounded-lg border border-border px-3 py-2'
                  >
                    <div>
                      <p className='font-medium'>{entry.actionLabel}</p>
                      <p className='text-xs text-muted-foreground'>
                        {ledgerUnitsLabel(entry.units, entry.assetId, snapshot.usdAssetId)} ·{' '}
                        {historyDateLabel(entry)}
                      </p>
                    </div>
                    <p className='font-mono text-xs'>
                      {entry.drCr === 'cr' ? '+' : '-'}
                      {formatLedgerAmount(
                        entry.amount as bigint | string,
                        entry.units,
                        entry.assetId,
                        snapshot.usdAssetId,
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>
            {historyByCategory?.balanceEdit.length === 0 ? (
              <p className='text-xs text-muted-foreground'>No balance edits yet.</p>
            ) : null}
          </section>

          <Separator />

          <section>
            <h3 className='mb-2 font-semibold'>Trades</h3>
            <ul className='flex flex-col gap-2'>
              {historyByCategory?.trade.map((entry) => {
                if (entry.category !== 'trade') return null;
                return (
                  <li key={entry.id} className='rounded-lg border border-border px-3 py-2'>
                    <p className='font-medium'>{entry.actionLabel}</p>
                    <p className='text-xs text-muted-foreground'>
                      market {entry.marketPublicId} · side {entry.side} · qty{' '}
                      {formatTokenAmount(asBigInt(entry.quantity))} · price{' '}
                      {formatUsdFromScaledQuote(asBigInt(entry.price))}
                    </p>
                    <p className='text-xs text-muted-foreground'>{historyDateLabel(entry)}</p>
                  </li>
                );
              })}
            </ul>
            {historyByCategory?.trade.length === 0 ? (
              <p className='text-xs text-muted-foreground'>No trades yet.</p>
            ) : null}
          </section>

          <Separator />

          <section>
            <h3 className='mb-2 font-semibold'>Liquidity provided</h3>
            <ul className='flex flex-col gap-2'>
              {historyByCategory?.liquidityProvided.map((entry) => {
                if (entry.category !== 'liquidityProvided') return null;
                return (
                  <li key={entry.id} className='rounded-lg border border-border px-3 py-2'>
                    <p className='font-medium'>{entry.actionLabel}</p>
                    <p className='text-xs text-muted-foreground'>
                      market {entry.marketPublicId} · spent quote{' '}
                      {formatUsdFromScaledQuote(asBigInt(entry.spentQuote))} · provided base{' '}
                      {formatTokenAmount(asBigInt(entry.providedBase))} · provided quote{' '}
                      {formatUsdFromScaledQuote(asBigInt(entry.providedQuote))}
                    </p>
                    <p className='text-xs text-muted-foreground'>{historyDateLabel(entry)}</p>
                  </li>
                );
              })}
            </ul>
            {historyByCategory?.liquidityProvided.length === 0 ? (
              <p className='text-xs text-muted-foreground'>No liquidity entries yet.</p>
            ) : null}
          </section>

          {historyByCategory?.legacy.length ? (
            <>
              <Separator />
              <section>
                <h3 className='mb-2 font-semibold'>Legacy</h3>
                <ul className='flex flex-col gap-2'>
                  {historyByCategory.legacy.map((entry) => {
                    if (entry.category !== 'legacy') return null;
                    return (
                      <li key={entry.id} className='rounded-lg border border-border px-3 py-2'>
                        <p className='font-medium'>{entry.actionLabel}</p>
                        <p className='text-xs text-muted-foreground'>{entry.reason}</p>
                        <p className='text-xs text-muted-foreground'>{historyDateLabel(entry)}</p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
// end of LLM written Code
