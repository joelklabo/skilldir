import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { RemoteSourceConfig, SourceConfig, SyncConfig } from './types.js';

function expandHome(value: string): string {
  if (value === '~') return os.homedir();
  if (value.startsWith('~/')) return path.join(os.homedir(), value.slice(2));
  return value;
}

export async function loadConfig(configPath: string): Promise<SyncConfig> {
  const resolvedConfigPath = path.resolve(
    process.cwd(),
    expandHome(configPath),
  );
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
  if (!Array.isArray(object.sources) || object.sources.length === 0) {
    throw new Error(
      `Config ${resolvedConfigPath} field "sources" must be a non-empty array.`,
    );
  }
  if (typeof object.output !== 'string' || object.output.trim().length === 0) {
    throw new Error(
      `Config ${resolvedConfigPath} field "output" must be a non-empty string.`,
    );
  }
  const baseDir = path.dirname(resolvedConfigPath);
  const sources = object.sources.map((entry, index) =>
    parseSourceEntry(entry, resolvedConfigPath, baseDir, index),
  );
  return {
    sources,
    output: path.resolve(baseDir, expandHome(object.output)),
  };
}

function parseSourceEntry(
  entry: unknown,
  configPath: string,
  baseDir: string,
  index: number,
): SourceConfig {
  if (typeof entry === 'string' && entry.trim().length > 0) {
    return path.resolve(baseDir, expandHome(entry));
  }
  if (typeof entry !== 'object' || entry === null) {
    throw new Error(
      `Config ${configPath} source at index ${index} must be a string path or remote source object.`,
    );
  }

  const source = entry as Record<string, unknown>;
  if (source.type !== 'remote') {
    throw new Error(
      `Config ${configPath} remote source at index ${index} must set "type" to "remote".`,
    );
  }
  if (typeof source.url !== 'string' || source.url.trim().length === 0) {
    throw new Error(
      `Config ${configPath} remote source at index ${index} field "url" must be a non-empty string.`,
    );
  }
  const remote: RemoteSourceConfig = {
    type: 'remote',
    url: source.url,
    auth: parseRemoteAuth(source.auth, configPath, index),
    refreshTtlSeconds: parsePositiveInteger(
      source.refreshTtlSeconds,
      300,
      configPath,
      index,
      'refreshTtlSeconds',
    ),
    requestTimeoutSeconds: parsePositiveInteger(
      source.requestTimeoutSeconds,
      10,
      configPath,
      index,
      'requestTimeoutSeconds',
    ),
    integrity: parseIntegrity(source.integrity, configPath, index),
  };
  if (typeof source.label === 'string' && source.label.trim().length > 0) {
    remote.label = source.label;
  }
  if (
    typeof source.description === 'string' &&
    source.description.trim().length > 0
  ) {
    remote.description = source.description;
  }
  return remote;
}

function parseRemoteAuth(value: unknown, configPath: string, index: number) {
  if (value === undefined) {
    return { type: 'none' } as const;
  }
  if (typeof value !== 'object' || value === null) {
    throw new Error(
      `Config ${configPath} remote source at index ${index} field "auth" must be an object.`,
    );
  }
  const auth = value as Record<string, unknown>;
  if (auth.type === 'none' || auth.type === undefined) {
    return { type: 'none' } as const;
  }
  if (
    auth.type === 'bearer-env' &&
    typeof auth.env === 'string' &&
    auth.env.trim().length > 0
  ) {
    return { type: 'bearer-env', env: auth.env } as const;
  }
  throw new Error(
    `Config ${configPath} remote source at index ${index} field "auth" must be { "type": "none" } or { "type": "bearer-env", "env": "NAME" }.`,
  );
}

function parsePositiveInteger(
  value: unknown,
  fallback: number,
  configPath: string,
  index: number,
  field: string,
) {
  if (value === undefined) return fallback;
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  throw new Error(
    `Config ${configPath} remote source at index ${index} field "${field}" must be a positive integer.`,
  );
}

function parseIntegrity(value: unknown, configPath: string, index: number) {
  if (value === undefined || value === 'required') {
    return 'required' as const;
  }
  throw new Error(
    `Config ${configPath} remote source at index ${index} field "integrity" must be "required".`,
  );
}
