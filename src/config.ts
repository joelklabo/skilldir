import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SyncConfig } from './types.js';

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === 'string' && entry.trim().length > 0)
  );
}

function expandHome(value: string): string {
  if (value === '~') return os.homedir();
  if (value.startsWith('~/')) return path.join(os.homedir(), value.slice(2));
  return value;
}

export async function loadConfig(configPath: string): Promise<SyncConfig> {
  const resolvedConfigPath = path.resolve(process.cwd(), expandHome(configPath));
  let raw: string;
  try {
    raw = await fs.readFile(resolvedConfigPath, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read config ${resolvedConfigPath}: ${message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse config ${resolvedConfigPath}: ${message}`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`Config ${resolvedConfigPath} must be a JSON object.`);
  }
  const object = parsed as Record<string, unknown>;
  if (!isStringArray(object.sources)) {
    throw new Error(
      `Config ${resolvedConfigPath} field "sources" must be a non-empty array of strings.`,
    );
  }
  if (typeof object.output !== 'string' || object.output.trim().length === 0) {
    throw new Error(
      `Config ${resolvedConfigPath} field "output" must be a non-empty string.`,
    );
  }
  const baseDir = path.dirname(resolvedConfigPath);
  return {
    sources: object.sources.map((entry) =>
      path.resolve(baseDir, expandHome(entry)),
    ),
    output: path.resolve(baseDir, expandHome(object.output)),
  };
}
