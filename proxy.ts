// beginning of LLM written Code, Model: GPT-5.5
/*
Decision questionnaire
- What should proxy do for roles?
  - [x] Lightweight session-presence redirect only; DB role checks stay in server layouts/actions.
  - [ ] Trust role data in Edge proxy.
*/
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/shared/auth-session';

export function proxy(req: NextRequest) {
  const hasSessionCookie = req.cookies.has(SESSION_COOKIE_NAME);
  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL('/account', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
// end of LLM written Code
