// beginning of LLM written Code, Model: GPT-5.5
/*
Decision questionnaire
- Where should admin route protection happen?
  - [x] Admin server layout backed by DB-loaded role checks.
  - [ ] Middleware only.
*/
import { redirect } from 'next/navigation';
import { AdminNav } from '@/components/layout/admin-nav';
import { getRequiredAdmin } from '@/lib/server/auth/guards';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  try {
    await getRequiredAdmin();
  } catch {
    redirect('/account');
  }

  return (
    <>
      <header className='border-b border-black/10'>
        <AdminNav />
      </header>
      <main className='mx-auto flex w-full max-w-5xl grow flex-col px-6 py-8'>{children}</main>
    </>
  );
}
// end of LLM written Code
