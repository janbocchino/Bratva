// beginning of LLM written Code, Model: gpt-5.3-codex
import { type } from 'arktype';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { assetReadRepo, assetWriteRepo } from '../lib/server/ports/asset';
import { Db, db } from '../lib/server/db';
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

async function ensureAsset(asset: AssetJsonFile): Promise<'created' | 'skipped'> {
  const existing = await Fn.pipe(
    assetReadRepo.getAsset({ ticker: asset.assetId }),
    E.provideService(Db, db),
    E.either,
    E.runPromise,
  );

  if (existing._tag === 'Right') return 'skipped';
  if (!isAssetNotFoundError(existing.left)) throw existing.left;

  await Fn.pipe(
    assetWriteRepo.createAsset({ name: asset.name, ticker: asset.assetId }),
    E.provideService(Db, db),
    E.runPromise,
  );
  return 'created';
}

async function main(): Promise<void> {
  const files = await resolveJsonFiles();
  if (files.length === 0) {
    console.log('No asset JSON files found.');
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const filePath of files) {
    const asset = await parseAssetFile(filePath);
    const result = await ensureAsset(asset);
    if (result === 'created') created += 1;
    else skipped += 1;
    console.log(`${result.toUpperCase()}: ${asset.assetId} (${asset.name}) from ${filePath}`);
  }

  console.log(`Asset import completed. created=${created} skipped=${skipped}`);
}

main().catch((error) => {
  console.error('Asset import failed:', error);
  process.exitCode = 1;
});
// end of LLM written Code
