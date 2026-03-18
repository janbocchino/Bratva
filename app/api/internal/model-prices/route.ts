//needed because otherwise I would have to move DB/domain write logic into Python (duplicate business logic), or

// beginning of LLM written Code, Model: gpt-5.3-codex
import { NextResponse } from 'next/server';
import { ingestModelPricesBatch } from '@/lib/server/actions/ingest-model-prices';

const LOCAL_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOCAL_HOST_PREFIXES = ['127.0.0.1', 'localhost', '[::1]'];

const firstForwardedIp = (value: string | null): string | null => {
  if (value === null) return null;
  const first = value.split(',')[0];
  return first ? first.trim() : null;
};

const isLocalRequest = (request: Request): boolean => {
  // beginning of LLM written Code, Model: gpt-5.3-codex
  const host = request.headers.get('host')?.trim().toLowerCase() ?? '';
  const isLocalHost = LOCAL_HOST_PREFIXES.some((prefix) => host.startsWith(prefix));
  if (!isLocalHost) return false;
  // end of LLM written Code

  const forwardedFor = firstForwardedIp(request.headers.get('x-forwarded-for'));
  if (forwardedFor !== null) return LOCAL_IPS.has(forwardedFor);

  const realIp = request.headers.get('x-real-ip');
  if (realIp !== null) return LOCAL_IPS.has(realIp.trim());

  return true;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unexpected error';

export async function POST(request: Request) {
  if (!isLocalRequest(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'This endpoint only accepts localhost requests.',
      },
      { status: 403 },
    );
  }

  try {
    const payload = (await request.json()) as unknown;
    const result = await ingestModelPricesBatch(payload);
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getErrorMessage(error),
      },
      { status: 400 },
    );
  }
}
// end of LLM written Code
