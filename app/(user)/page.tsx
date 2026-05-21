// beginning of LLM written Code, Model: GPT-5.5
import Link from 'next/link';

export default function Home() {
  return (
    <section className='flex grow flex-col items-center justify-center gap-8 text-center'>
      <h1 className='text-5xl font-semibold tracking-tight sm:text-6xl'>huzzdaq</h1>

      <div className='flex flex-col items-center gap-3'>
        <p className='text-sm text-black/70'>Create or manage your account to start trading.</p>
        <Link
          className='rounded border border-black/20 px-4 py-2 text-sm font-medium'
          href='/account'
        >
          Go to Account
        </Link>
      </div>
    </section>
  );
}
// end of LLM written Code
