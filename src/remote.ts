import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { performance } from 'node:perf_hooks';
import zlib from 'node:zlib';
import tar from 'tar-stream';
import {
  DoctorIssue,
  RemoteSourceConfig,
  SkillDirEntry,
  SyncWarning,
} from './types.js';

type RemoteIndexSkill = {
  key: string;
  version: string;
  digest: string;
  archiveUrl: string;
};

type CachedIndex = {
  schemaVersion: 1;
  fetchedAt: string;
  skills: RemoteIndexSkill[];
};

type SourceState = {
  schemaVersion: 1;
  url: string;
  digests: string[];
};

function cacheRoot() {
  return process.env.SKILLDIR_CACHE_DIR
    ? path.resolve(process.env.SKILLDIR_CACHE_DIR)
    : path.join(os.homedir(), '.local', 'share', 'skilldir', 'remote');
}

function cacheSourcesRoot() {
  return path.join(cacheRoot(), 'sources');
}

function cacheObjectsRoot() {
  return path.join(cacheRoot(), 'objects');
}

function sourceId(source: RemoteSourceConfig) {
  return crypto.createHash('sha256').update(source.url).digest('hex');
}

function sourceRoot(source: RemoteSourceConfig) {
  return path.join(cacheSourcesRoot(), sourceId(source));
}

function cachedIndexPath(source: RemoteSourceConfig) {
  return path.join(sourceRoot(source), 'index.json');
}

function sourceStatePath(source: RemoteSourceConfig) {
  return path.join(sourceRoot(source), 'state.json');
}

function objectRoot(digest: string) {
  return path.join(cacheObjectsRoot(), digest.replace(':', '-'));
}

function normalizeBaseUrl(url: string) {
  return url.endsWith('/') ? url : `${url}/`;
}

function resolveIndexUrl(source: RemoteSourceConfig) {
  return new URL('index.json', normalizeBaseUrl(source.url)).toString();
}

function resolveArchiveUrl(source: RemoteSourceConfig, archiveUrl: string) {
  return new URL(archiveUrl, normalizeBaseUrl(source.url)).toString();
}

function isRemoteIndexSkill(value: unknown): value is RemoteIndexSkill {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.key === 'string' &&
    entry.key.trim().length > 0 &&
    typeof entry.version === 'string' &&
    entry.version.trim().length > 0 &&
    typeof entry.digest === 'string' &&
    /^sha256:[a-f0-9]{64}$/u.test(entry.digest) &&
    typeof entry.archiveUrl === 'string' &&
    entry.archiveUrl.trim().length > 0
  );
}

async function exists(filePath: string) {
  try {
    await fs.lstat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeJsonAtomic(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    await fs.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await fs.rename(tempPath, filePath);
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => {});
  }
}

function createHeaders(source: RemoteSourceConfig) {
  const headers = new Headers();
  if (source.auth.type === 'bearer-env') {
    const token = process.env[source.auth.env];
    if (!token) {
      throw new Error(
        `Remote source ${source.url} requires credential env ${source.auth.env}.`,
      );
    }
    headers.set('authorization', `Bearer ${token}`);
  }
  return headers;
}

async function fetchText(source: RemoteSourceConfig, url: string) {
  const response = await fetch(url, {
    headers: createHeaders(source),
    signal: AbortSignal.timeout(source.requestTimeoutSeconds * 1000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }
  return await response.text();
}

async function fetchBuffer(source: RemoteSourceConfig, url: string) {
  const response = await fetch(url, {
    headers: createHeaders(source),
    signal: AbortSignal.timeout(source.requestTimeoutSeconds * 1000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function normalizeRemoteIndex(
  raw: string,
  source: RemoteSourceConfig,
): RemoteIndexSkill[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Remote source ${source.url} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as { skills?: unknown }).skills) ||
    !(parsed as { skills?: unknown[] }).skills?.every(isRemoteIndexSkill)
  ) {
    throw new Error(
      `Remote source ${source.url} returned an invalid index schema.`,
    );
  }
  return (parsed as { skills: RemoteIndexSkill[] }).skills;
}

async function readCachedIndex(source: RemoteSourceConfig) {
  try {
    const raw = await fs.readFile(cachedIndexPath(source), 'utf8');
    const parsed = JSON.parse(raw) as CachedIndex;
    if (
      parsed.schemaVersion === 1 &&
      Array.isArray(parsed.skills) &&
      parsed.skills.every(isRemoteIndexSkill)
    ) {
      return parsed;
    }
  } catch {
    // noop
  }
  return null;
}

function safeTarPath(root: string, archivePath: string) {
  if (path.isAbsolute(archivePath)) {
    throw new Error(`Archive entry ${archivePath} is absolute.`);
  }
  const normalized = path.posix.normalize(archivePath).replace(/^\.\/+/u, '');
  if (
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.includes('/../')
  ) {
    throw new Error(
      `Archive entry ${archivePath} escapes the destination root.`,
    );
  }
  const target = path.resolve(root, ...normalized.split('/'));
  const rootPath = path.resolve(root);
  if (target !== rootPath && !target.startsWith(`${rootPath}${path.sep}`)) {
    throw new Error(
      `Archive entry ${archivePath} escapes the destination root.`,
    );
  }
  return target;
}

async function extractTarGz(buffer: Buffer, destination: string) {
  const tarBuffer = zlib.gunzipSync(buffer);
  const extractor = tar.extract();

  await fs.mkdir(destination, { recursive: true });

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    extractor.on('entry', (header, stream, next) => {
      void (async () => {
        const targetPath = safeTarPath(destination, header.name);
        if (header.type === 'directory') {
          await fs.mkdir(targetPath, { recursive: true });
          stream.resume();
          next();
          return;
        }
        if (header.type !== 'file') {
          throw new Error(`Unsupported archive entry type: ${header.type}`);
        }
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          if (Buffer.isBuffer(chunk)) {
            chunks.push(chunk);
            continue;
          }
          if (chunk instanceof Uint8Array) {
            chunks.push(Buffer.from(chunk));
            continue;
          }
          throw new Error('Archive stream emitted an unsupported chunk type.');
        }
        await fs.writeFile(targetPath, Buffer.concat(chunks));
        next();
      })().catch((error) => {
        stream.resume();
        fail(error);
      });
    });

    extractor.once('finish', finish);
    extractor.once('error', fail);
    Readable.from(tarBuffer).pipe(extractor).once('error', fail);
  });

  if (!(await exists(path.join(destination, 'SKILL.md')))) {
    throw new Error('Archive does not contain a top-level SKILL.md.');
  }
}

function createDigest(buffer: Buffer) {
  return `sha256:${crypto.createHash('sha256').update(buffer).digest('hex')}`;
}

async function readStateDigests() {
  const digests = new Set<string>();
  const entries = await fs
    .readdir(cacheSourcesRoot(), { withFileTypes: true })
    .catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const raw = await fs.readFile(
        path.join(cacheSourcesRoot(), entry.name, 'state.json'),
        'utf8',
      );
      const parsed = JSON.parse(raw) as SourceState;
      if (
        parsed.schemaVersion === 1 &&
        Array.isArray(parsed.digests) &&
        parsed.digests.every((digest) => typeof digest === 'string')
      ) {
        for (const digest of parsed.digests) {
          digests.add(digest);
        }
      }
    } catch {
      // noop
    }
  }
  return digests;
}

export async function loadRemoteCandidates(input: {
  source: RemoteSourceConfig;
  sourceIndex: number;
}): Promise<{
  entries: SkillDirEntry[];
  warnings: SyncWarning[];
  durationMs: number;
}> {
  const startedAt = performance.now();
  const cached = await readCachedIndex(input.source);
  const fetchedAt = cached ? Date.parse(cached.fetchedAt) : NaN;
  const isFresh =
    cached !== null &&
    Number.isFinite(fetchedAt) &&
    Date.now() - fetchedAt <= input.source.refreshTtlSeconds * 1000;

  let skills: RemoteIndexSkill[];
  const warnings: SyncWarning[] = [];

  if (isFresh) {
    skills = cached.skills;
  } else {
    try {
      const raw = await fetchText(input.source, resolveIndexUrl(input.source));
      skills = normalizeRemoteIndex(raw, input.source);
      await writeJsonAtomic(cachedIndexPath(input.source), {
        schemaVersion: 1,
        fetchedAt: new Date().toISOString(),
        skills,
      } satisfies CachedIndex);
    } catch (error) {
      if (!cached) {
        throw error;
      }
      skills = cached.skills;
      warnings.push({
        code: 'remote-warning',
        source: input.source.url,
        message: `using stale cached index: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  await writeJsonAtomic(sourceStatePath(input.source), {
    schemaVersion: 1,
    url: input.source.url,
    digests: skills.map((skill) => skill.digest),
  } satisfies SourceState);

  return {
    entries: skills
      .map((skill) => {
        const targetDir = objectRoot(skill.digest);
        return {
          name: skill.key,
          dir: targetDir,
          skillFile: path.join(targetDir, 'SKILL.md'),
          source: input.source.url,
          sourceIndex: input.sourceIndex,
          remote: {
            sourceUrl: input.source.url,
            version: skill.version,
            digest: skill.digest,
            archiveUrl: resolveArchiveUrl(input.source, skill.archiveUrl),
          },
        } satisfies SkillDirEntry;
      })
      .sort((left, right) => left.dir.localeCompare(right.dir, 'en')),
    warnings,
    durationMs: performance.now() - startedAt,
  };
}

export async function materializeRemoteWinner(
  source: RemoteSourceConfig,
  entry: SkillDirEntry,
) {
  if (!entry.remote) return;
  if (await exists(path.join(entry.dir, 'SKILL.md'))) {
    return;
  }

  const tempDir = `${entry.dir}.tmp-${process.pid}-${Date.now()}`;
  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

  try {
    const buffer = await fetchBuffer(source, entry.remote.archiveUrl);
    if (createDigest(buffer) !== entry.remote.digest) {
      throw new Error(
        `Digest mismatch for ${entry.remote.archiveUrl}: expected ${entry.remote.digest}.`,
      );
    }
    await extractTarGz(buffer, tempDir);
    await fs.mkdir(path.dirname(entry.dir), { recursive: true });
    await fs.rename(tempDir, entry.dir);
  } catch (error) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

export async function pruneRemoteCache() {
  const liveDigests = await readStateDigests();
  const objectEntries = await fs
    .readdir(cacheObjectsRoot(), { withFileTypes: true })
    .catch(() => []);
  await Promise.all(
    objectEntries.map(async (entry) => {
      if (!entry.isDirectory()) return;
      const digest = entry.name.replace(/^sha256-/u, 'sha256:');
      if (liveDigests.has(digest)) return;
      await fs.rm(path.join(cacheObjectsRoot(), entry.name), {
        recursive: true,
        force: true,
      });
    }),
  );
}

export async function runRemoteDoctor(
  sources: RemoteSourceConfig[],
): Promise<DoctorIssue[]> {
  const issues: DoctorIssue[] = [];
  for (const source of sources) {
    if (source.auth.type === 'bearer-env' && !process.env[source.auth.env]) {
      issues.push({
        code: 'remote-auth-missing',
        source: source.url,
        env: source.auth.env,
      });
    }
    const cacheFiles = [cachedIndexPath(source), sourceStatePath(source)];
    for (const filePath of cacheFiles) {
      if (!(await exists(filePath))) continue;
      try {
        JSON.parse(await fs.readFile(filePath, 'utf8'));
      } catch {
        issues.push({
          code: 'remote-cache-corrupt',
          path: filePath,
        });
      }
    }
  }
  return issues;
}
