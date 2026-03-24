'use client';

import { useState } from 'react';

// beginning of LLM written Code, Model: gpt-5.3-codex-low
export default function Home() {
  const [status] = useState<string>('Go to Account to create or manage your account.');

  return (
    <section className='flex grow flex-col items-center justify-center gap-8'>
      <h1 className='text-5xl font-semibold tracking-tight sm:text-6xl'>huzzdaq</h1>

      <p className='text-sm text-black/70'>{status}</p>
    </section>
  );
}
// end of LLM written Code
