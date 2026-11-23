// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
/*
Decision questionnaire
- Where should v2 admin route protection happen?
  - [x] Server layout backed by `getRequiredAdmin()` with redirect to `/v2/account`.
  - [ ] Client-side role check only (rejected).
*/
import { redirect } from 'next/navigation';
import { V2AdminShell } from '@/components/v2/v2-admin-shell';
import { getRequiredAdmin } from '@/lib/server/auth/guards';

export const dynamic = 'force-dynamic';

export default async function V2AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  try {
    await getRequiredAdmin();
  } catch {
    redirect('/v2/account');
  }

  return <V2AdminShell>{children}</V2AdminShell>;
}
// end of LLM written Code
