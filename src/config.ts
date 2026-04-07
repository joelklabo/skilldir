import fs from 'node:fs/promises';
import path from 'node:path';
import { SyncConfig } from './types.js';

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === 'string' && entry.trim().length > 0)
  );
}

export async function loadConfig(configPath: string): Promise<SyncConfig> {
  const raw = await fs.readFile(configPath, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Config must be a JSON object.');
  }
  const object = parsed as Record<string, unknown>;
  if (!isStringArray(object.sources)) {
    throw new Error(
      'Config field "sources" must be a non-empty array of strings.',
    );
  }
  if (typeof object.output !== 'string' || object.output.trim().length === 0) {
    throw new Error('Config field "output" must be a non-empty string.');
  }
  const baseDir = path.dirname(configPath);
  return {
    sources: object.sources.map((entry) => path.resolve(baseDir, entry)),
    output: path.resolve(baseDir, object.output),
  };
}
