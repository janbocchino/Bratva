'use client';

import { useEffect, useState } from 'react';
import type { AccountHistoryEntry } from '@/domain/aggregates/account-history';
import type { LedgerUnits } from '@/domain/aggregates/ledger';
import type { AssetId } from '@/domain/values/asset';
import { formatTokenAmount } from '@/domain/values/format-fixed-point';
import { UserDisplayName, UserEmail } from '@/domain/values/user';
import { formatActionError } from '@/lib/client/format-action-error';
import { formatUsdFromScaledQuote } from '@/lib/client/format-scaled-usd';
import { addBalance } from '@/lib/server/actions/add-balance';
// beginning of LLM written Code, Model: Claude Opus 4.7
import { cancelOrder } from '@/lib/server/actions/cancel-order';
// end of LLM written Code
import { createUser } from '@/lib/server/actions/create-user';
import type { AccountSnapshot } from '@/lib/server/actions/get-account';
import { getAccount } from '@/lib/server/actions/get-account';
import { withdrawBalance } from '@/lib/server/actions/withdraw-balance';

// beginning of LLM written Code, Model: Claude Opus 4.5
const asBigInt = (amount: bigint | string): bigint =>
  typeof amount === 'bigint' ? amount : BigInt(amount);

const isUsdLedgerAsset = (assetId: AssetId | number, usdAssetId: AssetId | null): boolean =>
  usdAssetId !== null && Number(assetId) === Number(usdAssetId);

/** USD quote rows use `scaled_unit` in the DB; base tokens use `scaled_unit` too — disambiguate by asset id. */
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
// end of LLM written Code

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
  // beginning of LLM written Code, Model: Claude Opus 4.7
  const [cancelingOrderId, setCancelingOrderId] = useState<number | null>(null);
  const [cancelStatus, setCancelStatus] = useState<string>('');
  // end of LLM written Code

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
      // beginning of LLM written Code, Model: GPT-5.5
      await addBalance({ amountDollars });
      // end of LLM written Code
      await refreshAccount();
      setStatus('Balance added.');
    } catch (error) {
      setStatus(formatActionError(error, 'Failed to add balance.'));
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
      // beginning of LLM written Code, Model: GPT-5.5
      await withdrawBalance({ amountDollars });
      // end of LLM written Code
      await refreshAccount();
      setStatus('Withdrawn.');
    } catch (error) {
      setStatus(formatActionError(error, 'Failed to withdraw balance.'));
    } finally {
      setBalanceAction('idle');
    }
  };
  // end of LLM written Code

  // beginning of LLM written Code, Model: Claude Opus 4.7
  const handleCancelOrder = async (orderId: number, orderPublicId: string) => {
    if (!snapshot) return;
    setCancelingOrderId(orderId);
    setCancelStatus('');
    try {
      // beginning of LLM written Code, Model: GPT-5.5
      await cancelOrder({ orderId });
      // end of LLM written Code
      await refreshAccount();
      setCancelStatus(`Order ${orderPublicId} cancelled.`);
    } catch (error) {
      setCancelStatus(formatActionError(error, 'Failed to cancel order.'));
    } finally {
      setCancelingOrderId(null);
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
      setCreateStatus(formatActionError(error, 'Failed to create account.'));
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
        <form
          onSubmit={handleCreateUser}
          className='flex w-full max-w-md flex-col gap-3 rounded-lg border border-black/10 p-4'
        >
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
          <button
            className='rounded border border-black/20 px-3 py-2 text-sm font-medium'
            type='submit'
            disabled={isCreating}
          >
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
          {/* beginning of LLM written Code, Model: GPT-5.5 */}
          <div>
            <dt className='text-black/60'>Role</dt>
            <dd className='font-medium'>{snapshot.user.role}</dd>
          </div>
          {/* end of LLM written Code */}
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

      {/* beginning of LLM written Code, Model: Claude Opus 4.7 */}
      <section className='rounded-lg border border-black/10 p-4'>
        <h2 className='mb-3 text-lg font-medium'>Open orders</h2>
        {snapshot.openOrders.length === 0 ? (
          <p className='text-sm text-black/60'>No open orders.</p>
        ) : (
          <ul className='flex flex-col gap-2'>
            {snapshot.openOrders.map((order) => {
              const sideLabel = order.side === 'bid' ? 'Buy' : 'Sell';
              const tickerPair =
                order.baseAssetTicker && order.quoteAssetTicker
                  ? `${order.baseAssetTicker.toUpperCase()} / ${order.quoteAssetTicker.toUpperCase()}`
                  : `market ${order.marketPublicId}`;
              const isCanceling = cancelingOrderId === order.id;
              return (
                <li
                  key={order.id}
                  className='flex flex-wrap items-center justify-between gap-3 rounded border border-black/10 px-3 py-2'
                >
                  <div className='flex flex-col gap-0.5'>
                    <p className='font-medium'>
                      {sideLabel} {tickerPair}
                    </p>
                    <p className='text-xs text-black/60'>
                      id {order.publicId} | price{' '}
                      {formatUsdFromScaledQuote(asBigInt(order.priceScaled))} | qty{' '}
                      {formatTokenAmount(asBigInt(order.quantityScaled))} | filled{' '}
                      {formatTokenAmount(asBigInt(order.filledScaled))}
                    </p>
                    <p className='text-xs text-black/60'>
                      placed {new Date(order.createdAtIso).toLocaleString()} | expires{' '}
                      {new Date(order.expiresAtIso).toLocaleString()}
                    </p>
                  </div>
                  <button
                    className='rounded border border-black/20 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50'
                    type='button'
                    onClick={() => void handleCancelOrder(order.id, order.publicId)}
                    disabled={isCanceling || cancelingOrderId !== null}
                  >
                    {isCanceling ? 'Cancelling...' : 'Cancel'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {cancelStatus ? <p className='mt-2 text-xs text-black/70'>{cancelStatus}</p> : null}
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
                <tr
                  key={`${balance.assetId}-${balance.units}`}
                  className='border-b border-black/10 last:border-b-0'
                >
                  <td className='px-3 py-2'>{balance.assetId}</td>
                  <td className='px-3 py-2 text-black/80'>
                    {ledgerUnitsLabel(balance.units, balance.assetId, snapshot.usdAssetId)}
                  </td>
                  <td className='px-3 py-2 font-mono'>
                    {formatLedgerAmount(
                      balance.balance as bigint | string,
                      balance.units,
                      balance.assetId,
                      snapshot.usdAssetId,
                    )}
                  </td>
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
                  <li
                    key={entry.id}
                    className='flex items-center justify-between rounded border border-black/10 px-3 py-2'
                  >
                    <div>
                      <p className='font-medium'>{entry.actionLabel}</p>
                      <p className='text-xs text-black/60'>
                        asset {entry.assetId} |{' '}
                        {ledgerUnitsLabel(entry.units, entry.assetId, snapshot.usdAssetId)} |{' '}
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
                      market {entry.marketPublicId} | base {entry.baseAssetId} / quote{' '}
                      {entry.quoteAssetId}
                    </p>
                    <p className='text-xs text-black/60'>
                      side {entry.side} | source {entry.source} | qty{' '}
                      {formatTokenAmount(asBigInt(entry.quantity))} | price{' '}
                      {formatUsdFromScaledQuote(asBigInt(entry.price))}
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
                      market {entry.marketPublicId} | base {entry.baseAssetId} / quote{' '}
                      {entry.quoteAssetId}
                    </p>
                    <p className='text-xs text-black/60'>
                      spent quote {formatUsdFromScaledQuote(asBigInt(entry.spentQuote))} | provided
                      base {formatTokenAmount(asBigInt(entry.providedBase))} | provided quote{' '}
                      {formatUsdFromScaledQuote(asBigInt(entry.providedQuote))}
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
