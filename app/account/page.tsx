'use client';

import { useEffect, useState } from 'react';
import type { AccountSnapshot } from '@/lib/server/actions/get-account';
import type { AccountHistoryEntry } from '@/domain/aggregates/account-history';
import { addBalance } from '@/lib/server/actions/add-balance';
import { createUser } from '@/lib/server/actions/create-user';
import { getAccount } from '@/lib/server/actions/get-account';
import { withdrawBalance } from '@/lib/server/actions/withdraw-balance';
import { UserDisplayName, UserEmail } from '@/domain/values/user';

// beginning of LLM written Code, Model: gpt-5.3-codex-low
export default function AccountPage() {
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [amountDollars, setAmountDollars] = useState('10.00');
  const [status, setStatus] = useState<string>('');
  const [createStatus, setCreateStatus] = useState<string>('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [balanceAction, setBalanceAction] = useState<'idle' | 'add' | 'withdraw'>('idle');
  const [isCreating, setIsCreating] = useState(false);

  const refreshAccount = async () => {
    setIsLoading(true);
    const account = await getAccount();
    setSnapshot(account);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshAccount();
  }, []);

  const handleAddBalance = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!snapshot) return;

    setStatus('');
    setBalanceAction('add');
    try {
      await addBalance({ userId: snapshot.user.id, amountDollars });
      await refreshAccount();
      setStatus('Balance added.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add balance.';
      setStatus(message);
    } finally {
      setBalanceAction('idle');
    }
  };

  // beginning of LLM written Code, Model: Claude Opus 4.5
  const handleWithdrawBalance = async () => {
    if (!snapshot) return;

    setStatus('');
    setBalanceAction('withdraw');
    try {
      await withdrawBalance({ userId: snapshot.user.id, amountDollars });
      await refreshAccount();
      setStatus('Withdrawn.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to withdraw balance.';
      setStatus(message);
    } finally {
      setBalanceAction('idle');
    }
  };
  // end of LLM written Code

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateStatus('');
    setIsCreating(true);
    try {
      const createdUser = await createUser({
        displayName: UserDisplayName(displayName),
        email: UserEmail(email),
      });
      setDisplayName('');
      setEmail('');
      await refreshAccount();
      setCreateStatus(`Account created for ${createdUser.displayName}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create account.';
      setCreateStatus(message);
    } finally {
      setIsCreating(false);
    }
  };

  // beginning of LLM written Code, Model: gpt-5.3-codex
  const historyDateLabel = (entry: AccountHistoryEntry): string => {
    if (!entry.hasAccurateTimestamp) return 'timestamp unavailable';
    const date = new Date(entry.occurredAtIso);
    return Number.isNaN(date.getTime()) ? 'timestamp unavailable' : date.toLocaleString();
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
  // end of LLM written Code

  if (isLoading) {
    return <section className='text-sm text-black/70'>Loading account...</section>;
  }

  if (!snapshot) {
    return (
      <section className='flex flex-col gap-6'>
        <header className='flex flex-col gap-1'>
          <h1 className='text-3xl font-semibold tracking-tight'>Account</h1>
          <p className='text-sm text-black/70'>Create an account to start funding and trading.</p>
        </header>
        <form onSubmit={handleCreateUser} className='flex w-full max-w-md flex-col gap-3 rounded-lg border border-black/10 p-4'>
          <h2 className='text-lg font-medium'>Create Account</h2>
          <input
            className='rounded border border-black/20 px-3 py-2'
            type='text'
            placeholder='Display name'
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
          <input
            className='rounded border border-black/20 px-3 py-2'
            type='email'
            placeholder='Email'
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button className='rounded border border-black/20 px-3 py-2 text-sm font-medium' type='submit' disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Account'}
          </button>
          {createStatus ? <p className='text-sm text-black/70'>{createStatus}</p> : null}
        </form>
      </section>
    );
  }

  return (
    <section className='flex flex-col gap-8'>
      <header className='flex flex-col gap-1'>
        <h1 className='text-3xl font-semibold tracking-tight'>Account</h1>
        <p className='text-sm text-black/70'>Profile, balances, and ledger overview.</p>
      </header>

      <section className='rounded-lg border border-black/10 p-4'>
        <h2 className='mb-3 text-lg font-medium'>User Information</h2>
        <dl className='grid gap-2 text-sm sm:grid-cols-2'>
          <div>
            <dt className='text-black/60'>Display Name</dt>
            <dd className='font-medium'>{snapshot.user.displayName}</dd>
          </div>
          <div>
            <dt className='text-black/60'>Email</dt>
            <dd className='font-medium'>{snapshot.user.email}</dd>
          </div>
        </dl>
      </section>

      {/* beginning of LLM written Code, Model: Claude Opus 4.5 */}
      <section className='rounded-lg border border-black/10 p-4'>
        <h2 className='mb-3 text-lg font-medium'>Add / withdraw balance</h2>
        <form onSubmit={handleAddBalance} className='flex flex-col gap-2 sm:max-w-md'>
          <input
            className='rounded border border-black/20 px-3 py-2 text-sm'
            type='text'
            value={amountDollars}
            onChange={(event) => setAmountDollars(event.target.value)}
            placeholder='Amount in dollars'
          />
          <div className='flex flex-wrap gap-2'>
            <button
              className='rounded border border-black/20 px-3 py-2 text-sm font-medium'
              type='submit'
              disabled={balanceAction !== 'idle'}
            >
              {balanceAction === 'add' ? 'Adding...' : 'Add Balance'}
            </button>
            <button
              className='rounded border border-black/20 px-3 py-2 text-sm font-medium'
              type='button'
              disabled={balanceAction !== 'idle'}
              onClick={() => void handleWithdrawBalance()}
            >
              {balanceAction === 'withdraw' ? 'Withdrawing...' : 'Withdraw'}
            </button>
          </div>
          {status ? <p className='text-xs text-black/70'>{status}</p> : null}
        </form>
      </section>
      {/* end of LLM written Code */}

      <section className='rounded-lg border border-black/10 p-4'>
        <h2 className='mb-3 text-lg font-medium'>Balance</h2>
        <div className='overflow-hidden rounded border border-black/10'>
          <table className='w-full border-collapse text-left text-sm'>
            <thead className='border-b border-black/10 bg-black/5'>
              <tr>
                <th className='px-3 py-2 font-medium'>Asset Id</th>
                <th className='px-3 py-2 font-medium'>Units</th>
                <th className='px-3 py-2 font-medium'>Total</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.ledger.summary.map((balance) => (
                <tr key={`${balance.assetId}-${balance.units}`} className='border-b border-black/10 last:border-b-0'>
                  <td className='px-3 py-2'>{balance.assetId}</td>
                  <td className='px-3 py-2 uppercase'>{balance.units}</td>
                  <td className='px-3 py-2 font-mono'>{balance.balance.toString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className='rounded-lg border border-black/10 p-4'>
        <h2 className='mb-3 text-lg font-medium'>Ledger</h2>
        {/* beginning of LLM written Code, Model: gpt-5.3-codex */}
        <div className='flex flex-col gap-4 text-sm'>
          <section>
            <h3 className='mb-2 text-sm font-semibold'>Balance edit</h3>
            <ul className='flex flex-col gap-2'>
              {historyByCategory?.balanceEdit.map((entry) => {
                if (entry.category !== 'balanceEdit') return null;
                return (
                  <li key={entry.id} className='flex items-center justify-between rounded border border-black/10 px-3 py-2'>
                    <div>
                      <p className='font-medium'>{entry.actionLabel}</p>
                      <p className='text-xs text-black/60'>
                        asset {entry.assetId} | {entry.units} | {historyDateLabel(entry)}
                      </p>
                    </div>
                    <p className='font-mono text-xs'>
                      {entry.drCr === 'cr' ? '+' : '-'}
                      {entry.amount.toString()}
                    </p>
                  </li>
                );
              })}
            </ul>
            {historyByCategory?.balanceEdit.length === 0 ? (
              <p className='text-xs text-black/60'>No balance edits yet.</p>
            ) : null}
          </section>

          <section>
            <h3 className='mb-2 text-sm font-semibold'>Trades</h3>
            <ul className='flex flex-col gap-2'>
              {historyByCategory?.trade.map((entry) => {
                if (entry.category !== 'trade') return null;
                return (
                  <li key={entry.id} className='rounded border border-black/10 px-3 py-2'>
                    <p className='font-medium'>{entry.actionLabel}</p>
                    <p className='text-xs text-black/60'>
                      market {entry.marketPublicId} | base {entry.baseAssetId} / quote {entry.quoteAssetId}
                    </p>
                    <p className='text-xs text-black/60'>
                      side {entry.side} | source {entry.source} | qty {entry.quantity} | price {entry.price.toString()}
                    </p>
                    <p className='text-xs text-black/60'>{historyDateLabel(entry)}</p>
                  </li>
                );
              })}
            </ul>
            {historyByCategory?.trade.length === 0 ? (
              <p className='text-xs text-black/60'>No trades yet.</p>
            ) : null}
          </section>

          <section>
            <h3 className='mb-2 text-sm font-semibold'>Liquidity provided</h3>
            <ul className='flex flex-col gap-2'>
              {historyByCategory?.liquidityProvided.map((entry) => {
                if (entry.category !== 'liquidityProvided') return null;
                return (
                  <li key={entry.id} className='rounded border border-black/10 px-3 py-2'>
                    <p className='font-medium'>{entry.actionLabel}</p>
                    <p className='text-xs text-black/60'>
                      market {entry.marketPublicId} | base {entry.baseAssetId} / quote {entry.quoteAssetId}
                    </p>
                    <p className='text-xs text-black/60'>
                      spent quote {entry.spentQuote.toString()} | provided base {entry.providedBase.toString()} | provided quote {entry.providedQuote.toString()}
                    </p>
                    <p className='text-xs text-black/60'>{historyDateLabel(entry)}</p>
                  </li>
                );
              })}
            </ul>
            {historyByCategory?.liquidityProvided.length === 0 ? (
              <p className='text-xs text-black/60'>No liquidity entries yet.</p>
            ) : null}
          </section>

          {historyByCategory?.legacy.length ? (
            <section>
              <h3 className='mb-2 text-sm font-semibold'>Legacy entry</h3>
              <ul className='flex flex-col gap-2'>
                {historyByCategory.legacy.map((entry) => {
                  if (entry.category !== 'legacy') return null;
                  return (
                    <li key={entry.id} className='rounded border border-black/10 px-3 py-2'>
                      <p className='font-medium'>{entry.actionLabel}</p>
                      <p className='text-xs text-black/60'>{entry.reason}</p>
                      <p className='text-xs text-black/60'>{historyDateLabel(entry)}</p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
        {/* end of LLM written Code */}
      </section>
    </section>
  );
}
// end of LLM written Code
