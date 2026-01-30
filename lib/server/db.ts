import { Context, Layer } from 'effect';
import { drizzle } from 'drizzle-orm/libsql';
import { serverEnv } from '@/lib/server/env';
import * as schema from '@/lib/server/schema';

export const db = drizzle(serverEnv.DATABASE_URL, { schema });

export type DB = typeof db;

export class Db extends Context.Tag('Db')<Db, DB>() {}