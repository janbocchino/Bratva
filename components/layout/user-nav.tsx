// beginning of LLM written Code, Model: GPT-5.5
/*
Decision questionnaire
- Where should user navigation live?
  - [x] Dedicated layout component rendered once by the user route shell.
  - [ ] Per-page links and role conditionals.
*/
import Link from 'next/link';

export function UserNav() {
  return (
    <nav className='mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-4 text-sm uppercase tracking-wide'>
      <Link href='/'>home</Link>
      <Link href='/explore'>explore</Link>
      <Link href='/account'>account</Link>
    </nav>
  );
}
// end of LLM written Code
