// beginning of LLM written Code, Model: gpt-5.3-codex
import { type } from 'arktype';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { assetReadRepo, assetWriteRepo } from '../lib/server/ports/asset';
import { Db, db } from '../lib/server/db';
import { markets } from '../lib/server/schema';
import { E, Fn } from '../lib/shared/imports';

const AssetJsonFile = type({
  assetId: 'string.trim |> string.lower',
  name: 'string.trim',
});

type AssetJsonFile = typeof AssetJsonFile.infer;

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

async function parseAssetFile(filePath: string): Promise<AssetJsonFile> {
  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  return AssetJsonFile.assert(parsed);
}

async function resolveUsdAssetId(): Promise<number> {
  // beginning of LLM written Code, Model: gpt-5.3-codex-low
  const usd = await Fn.pipe(assetReadRepo.getAsset({ ticker: 'usd' }), E.provideService(Db, db), E.either, E.runPromise);
  if (usd._tag === 'Right') return usd.right.id;
  throw new Error('USD asset missing. Create asset with ticker `usd` before running import.');
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
      modelPrice: 0n,
      totalLpTokens: 0n,
      status: 'closed',
      wasPreviouslyActive: false,
    })
    .onConflictDoNothing({
      target: [markets.baseAssetId, markets.quoteAssetId],
    })
    .returning({ id: markets.id });
  return inserted.length > 0;
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

  for (const filePath of files) {
    const asset = await parseAssetFile(filePath);
    const result = await ensureAsset(asset);
    if (result.kind === 'created') created += 1;
    else skipped += 1;

    if (result.assetId === usdAssetId) {
      marketsSkipped += 1;
      console.log(`${result.kind.toUpperCase()}: ${asset.assetId} (${asset.name}) (self-quote skipped) from ${filePath}`);
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
    `Asset import completed. created=${created} skipped=${skipped} marketsCreated=${marketsCreated} marketsSkipped=${marketsSkipped}`,
  );
}

main().catch((error) => {
  console.error('Asset import failed:', error);
  process.exitCode = 1;
});
// end of LLM written Code
