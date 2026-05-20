// beginning of LLM written Code, Model: GPT-5.5
/*
Decision questionnaire
- What is the smallest session foundation for roles?
  - [x] Signed HTTP-only cookie containing user id and expiry; role is loaded from the DB.
  - [ ] Store role in the cookie/JWT.
- How should missing secrets behave?
  - [x] Allow a deterministic dev secret outside production, require AUTH_SESSION_SECRET in production.
  - [ ] Silently disable signature checks.
*/
import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { InvalidSessionError } from '@/domain/errors';
import { UserId } from '@/domain/values/user';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/shared/auth-session';
import { serverEnv } from '../env';

type SessionPayload = {
  userId: UserId;
  expiresAtMs: number;
};

const SESSION_SEPARATOR = '.';
const DEV_SESSION_SECRET = 'bratva-dev-session-secret';

function sessionSecret(): string {
  const configured = serverEnv.AUTH_SESSION_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== 'production') return DEV_SESSION_SECRET;
  throw new InvalidSessionError({ cause: 'Missing AUTH_SESSION_SECRET' });
}

function sign(unsignedValue: string): string {
  return createHmac('sha256', sessionSecret()).update(unsignedValue).digest('base64url');
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function encodeSession(payload: SessionPayload): string {
  const unsignedValue = `${Number(payload.userId)}${SESSION_SEPARATOR}${payload.expiresAtMs}`;
  return `${unsignedValue}${SESSION_SEPARATOR}${sign(unsignedValue)}`;
}

function decodeSession(value: string): SessionPayload | null {
  const [userIdRaw, expiresAtRaw, signature, ...rest] = value.split(SESSION_SEPARATOR);
  if (rest.length > 0 || !userIdRaw || !expiresAtRaw || !signature) return null;

  const unsignedValue = `${userIdRaw}${SESSION_SEPARATOR}${expiresAtRaw}`;
  if (!signaturesMatch(signature, sign(unsignedValue))) return null;

  const userId = Number(userIdRaw);
  const expiresAtMs = Number(expiresAtRaw);
  if (!Number.isInteger(userId) || userId <= 0) return null;
  if (!Number.isInteger(expiresAtMs) || expiresAtMs <= Date.now()) return null;

  return { userId: UserId(userId), expiresAtMs };
}

export async function readSessionUserId(): Promise<UserId | null> {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawValue) return null;

  return decodeSession(rawValue)?.userId ?? null;
}

export async function setSessionUser(userId: UserId): Promise<void> {
  const cookieStore = await cookies();
  const expiresAtMs = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  cookieStore.set(SESSION_COOKIE_NAME, encodeSession({ userId, expiresAtMs }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
// end of LLM written Code
