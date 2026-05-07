import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppDb } from '../src/shared/types';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const dbFile = path.resolve(currentDir, '../data/db.json');

const defaultDb: AppDb = {
  users: [],
  messages: [],
  stories: [],
};

export async function readDb(): Promise<AppDb> {
  try {
    const raw = await fs.readFile(dbFile, 'utf8');
    return JSON.parse(raw) as AppDb;
  } catch {
    await writeDb(defaultDb);
    return structuredClone(defaultDb);
  }
}

export async function writeDb(db: AppDb): Promise<void> {
  await fs.mkdir(path.dirname(dbFile), { recursive: true });
  await fs.writeFile(dbFile, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
}

export function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function clampNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? Number(parsed) : fallback;
}
