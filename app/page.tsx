'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { UserLedger } from '@/domain/aggregates/ledger';
import type { User } from '@/domain/aggregates/user';
import { UserDisplayName, UserEmail } from '@/domain/values/user';
import { addBalance } from '@/lib/server/actions/add-balance';
import { createUser } from '@/lib/server/actions/create-user';

function jsonWithBigInt(value: unknown): string {
  return JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [ledger, setLedger] = useState<UserLedger | null>(null);
  const [displayName, setDisplayName] = useState<UserDisplayName>(UserDisplayName(''));
  const [email, setEmail] = useState<UserEmail>(UserEmail(''));
  const [amountDollars, setAmountDollars] = useState<string>('10.00');

  const handleCreateUser = async () => {
    const u = await createUser({
      displayName,
      email,
    });
    setUser(u);
    setLedger(null);
  };

  const handleAddBalance = async () => {
    if (!user) return;
    const l = await addBalance({
      userId: user.id,
      amountDollars,
    });
    setLedger(l);
  };

  return (
    <div className='flex flex-col grow flex-1 items-center justify-center gap-2'>
      <h1>Create Account</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCreateUser();
        }}
        className='flex flex-col gap-2'
      >
        <input
          type='text'
          name='displayName'
          placeholder='Display Name'
          value={displayName}
          onChange={(e) => setDisplayName(UserDisplayName(e.target.value))}
        />
        <input
          type='email'
          name='email'
          placeholder='Email'
          value={email}
          onChange={(e) => setEmail(UserEmail(e.target.value))}
        />
        <button type='submit'>Create User</button>
      </form>
      {user ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddBalance();
          }}
          className='flex flex-col gap-2'
        >
          <h2>Add balance (USD)</h2>
          <input
            type='text'
            name='amountDollars'
            placeholder='Amount in dollars (e.g. 10.00)'
            value={amountDollars}
            onChange={(e) => setAmountDollars(e.target.value)}
          />
          <button type='submit'>Add balance</button>
        </form>
      ) : null}
      <div className='flex flex-col font-mono'>
        <pre>{jsonWithBigInt(user)}</pre>
        <pre>{jsonWithBigInt(ledger)}</pre>
      </div>
    </div>
  );
}
