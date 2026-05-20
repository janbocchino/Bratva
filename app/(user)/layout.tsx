// beginning of LLM written Code, Model: GPT-5.5
/*
Decision questionnaire
- Should the user shell require an authenticated session?
  - [x] No, because `/account` is also the account creation/session bootstrap page.
  - [ ] Yes, which would block first-time account creation.
*/
import { UserNav } from '@/components/layout/user-nav';

export default function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className='border-b border-black/10'>
        <UserNav />
      </header>
      <main className='mx-auto flex w-full max-w-5xl grow flex-col px-6 py-8'>{children}</main>
    </>
  );
}
// end of LLM written Code
