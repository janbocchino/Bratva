// beginning of LLM written Code, Model: gpt-5.3-codex

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type } from 'arktype';
import { Db, db } from '../lib/server/db';
import { assetReadRepo, assetWriteRepo } from '../lib/server/ports/asset';
import { markets, modelPrice } from '../lib/server/schema';
import { E, Fn } from '../lib/shared/imports';

// beginning of LLM written Code, Model: gpt-5.3-codex
/*
Decision questionnaire
- Should newly created USD markets receive an initial model-price row?
  - [x] Yes, insert a `model_price` row at `0` to keep read paths consistent.
  - [ ] No, require external ingestion before market reads.
*/
// end of LLM written Code
const AssetJsonFile = type({
  assetId: 'string.trim |> string.lower',
  // beginning of LLM written Code, Model: GPT-5.5
  kind: 'string?',
  // end of LLM written Code
  name: 'string.trim',
});

type AssetJsonFile = typeof AssetJsonFile.infer;

// beginning of LLM written Code, Model: GPT-5.5
type ParsedAssetFile = {
  asset: AssetJsonFile;
  sourceAssetId: string;
  sourceData: unknown;
};

const LIVE_ASSETS_DIR = path.resolve('assets/live');
// end of LLM written Code

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function resolveJsonFiles(): Promise<string[]> {
  const file = getArg('--file');
  if (file) return [path.resolve(file)];

  const dir = path.resolve(getArg('--dir') ?? 'assets');
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

function isAssetNotFoundError(error: unknown): boolean {
  const maybeCause = (error as { cause?: { name?: string; _tag?: string } }).cause;
  return maybeCause?.name === 'AssetNotFoundError' || maybeCause?._tag === 'AssetNotFoundError';
}

async function parseAssetFile(filePath: string): Promise<ParsedAssetFile> {
  const raw = await readFile(filePath, 'utf8');
  // beginning of LLM written Code, Model: GPT-5.5
  const sourceData = JSON.parse(raw) as unknown;
  const asset = AssetJsonFile.assert(sourceData);
  const rawAssetId =
    typeof sourceData === 'object' &&
    sourceData !== null &&
    'assetId' in sourceData &&
    typeof sourceData.assetId === 'string'
      ? sourceData.assetId.trim()
      : asset.assetId;
  return { asset, sourceAssetId: rawAssetId, sourceData };
  // end of LLM written Code
}

// beginning of LLM written Code, Model: GPT-5.5
const isFileExistsError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 'EEXIST';

async function ensureLiveMirror(
  asset: AssetJsonFile,
  sourceAssetId: string,
  sourceData: unknown,
): Promise<'created' | 'skipped'> {
  if (asset.kind !== 'token' || asset.assetId === 'usd') return 'skipped';

  await mkdir(LIVE_ASSETS_DIR, { recursive: true });
  const livePath = path.join(LIVE_ASSETS_DIR, `${sourceAssetId}.json`);
  try {
    await writeFile(livePath, `${JSON.stringify(sourceData, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    return 'created';
  } catch (error) {
    if (isFileExistsError(error)) return 'skipped';
    throw error;
  }
}
// end of LLM written Code

async function resolveUsdAssetId(): Promise<number> {
  // beginning of LLM written Code, Model: GPT-5.2
  const usd = await ensureAsset({ assetId: 'usd', name: 'US Dollar' });
  if (usd.kind === 'created') {
    console.log('CREATED: usd (US Dollar) (bootstrap quote asset)');
  }
  return usd.assetId;
  // end of LLM written Code
}

async function createAssetUsdMarket(baseAssetId: number, usdAssetId: number): Promise<boolean> {
  const inserted = await db
    .insert(markets)
    .values({
      baseAssetId,
      quoteAssetId: usdAssetId,
      sequenceNumber: 0,
      ammReserveBase: 0n,
      ammReserveQuote: 0n,
      totalLpTokens: 0n,
      status: 'closed',
      wasPreviouslyActive: false,
    })
    .onConflictDoNothing({
      target: [markets.baseAssetId, markets.quoteAssetId],
    })
    .returning({ id: markets.id });
  if (inserted.length === 0) return false;

  await db.insert(modelPrice).values({
    marketId: inserted[0].id,
    price: 0n,
    createdAt: new Date(),
  });
  return true;
}

async function ensureAsset(
  asset: AssetJsonFile,
): Promise<{ kind: 'created'; assetId: number } | { kind: 'skipped'; assetId: number }> {
  const existing = await Fn.pipe(
    assetReadRepo.getAsset({ ticker: asset.assetId }),
    E.provideService(Db, db),
    E.either,
    E.runPromise,
  );

  if (existing._tag === 'Right') return { kind: 'skipped', assetId: existing.right.id };
  if (!isAssetNotFoundError(existing.left)) throw existing.left;

  const created = await Fn.pipe(
    assetWriteRepo.createAsset({ name: asset.name, ticker: asset.assetId }),
    E.provideService(Db, db),
    E.runPromise,
  );
  return { kind: 'created', assetId: created.id };
}

async function main(): Promise<void> {
  const files = await resolveJsonFiles();
  if (files.length === 0) {
    console.log('No asset JSON files found.');
    return;
  }

  const usdAssetId = await resolveUsdAssetId();
  let created = 0;
  let skipped = 0;
  let marketsCreated = 0;
  let marketsSkipped = 0;
  // beginning of LLM written Code, Model: GPT-5.5
  let liveMirrorsCreated = 0;
  let liveMirrorsSkipped = 0;
  // end of LLM written Code

  for (const filePath of files) {
    // beginning of LLM written Code, Model: GPT-5.5
    const parsed = await parseAssetFile(filePath);
    const { asset, sourceAssetId, sourceData } = parsed;
    const liveMirror = await ensureLiveMirror(asset, sourceAssetId, sourceData);
    if (liveMirror === 'created') liveMirrorsCreated += 1;
    else liveMirrorsSkipped += 1;
    // end of LLM written Code
    const result = await ensureAsset(asset);
    if (result.kind === 'created') created += 1;
    else skipped += 1;

    if (result.assetId === usdAssetId) {
      marketsSkipped += 1;
      console.log(
        `${result.kind.toUpperCase()}: ${asset.assetId} (${asset.name}) (self-quote skipped) from ${filePath}`,
      );
      continue;
    }

    const didCreateMarket = await createAssetUsdMarket(result.assetId, usdAssetId);
    if (didCreateMarket) marketsCreated += 1;
    else marketsSkipped += 1;
    console.log(
      // beginning of LLM written Code, Model: gpt-5.3-codex-low
      `${result.kind.toUpperCase()}: ${asset.assetId} (${asset.name}) market=${didCreateMarket ? 'CREATED' : 'SKIPPED'} pair=${asset.assetId}/usd from ${filePath}`,
      // end of LLM written Code
    );
  }

  console.log(
    // beginning of LLM written Code, Model: GPT-5.5
    `Asset import completed. created=${created} skipped=${skipped} marketsCreated=${marketsCreated} marketsSkipped=${marketsSkipped} liveMirrorsCreated=${liveMirrorsCreated} liveMirrorsSkipped=${liveMirrorsSkipped}`,
    // end of LLM written Code
  );
}

main().catch((error) => {
  console.error('Asset import failed:', error);
  process.exitCode = 1;
});
// end of LLM written Code
