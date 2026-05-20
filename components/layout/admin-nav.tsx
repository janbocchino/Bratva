// beginning of LLM written Code, Model: GPT-5.5
/*
Decision questionnaire
- Where should admin navigation live?
  - [x] Separate admin shell component so admin links never leak into user nav.
  - [ ] Conditional links inside the user navigation.
*/
import Link from 'next/link';

export function AdminNav() {
  return (
    <nav className='mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-4 text-sm uppercase tracking-wide'>
      <Link href='/'>home</Link>
      <Link href='/admin'>admin</Link>
      <Link href='/account'>account</Link>
    </nav>
  );
}
// end of LLM written Code
