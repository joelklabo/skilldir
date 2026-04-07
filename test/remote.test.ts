import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import tar from 'tar-stream';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { runDoctor } from '../src/doctor.js';
import { runSync } from '../src/sync.js';
import { renderStatusJson } from '../src/status.js';
import { makeTempDir, readSymlinkTarget } from './helpers.js';

type RemoteSkill = {
  key: string;
  version: string;
  digest: string;
  archiveUrl: string;
};

type RemoteRegistryState = {
  skills: RemoteSkill[];
  archives: Map<string, Buffer>;
  indexStatus?: number;
  indexBody?: string;
  authToken?: string;
  archiveStatusByPath: Map<string, number>;
  delayMs?: number;
  hits: Record<string, number>;
};

type RemoteRegistry = {
  baseUrl: string;
  state: RemoteRegistryState;
  close: () => Promise<void>;
};

const envKeys = ['SKILLDIR_CACHE_DIR', 'SKILLDIR_TOKEN'] as const;
const envBackup = new Map<string, string | undefined>();

afterEach(() => {
  for (const key of envKeys) {
    const value = envBackup.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  envBackup.clear();
});

function setEnv(key: (typeof envKeys)[number], value: string | undefined) {
  if (!envBackup.has(key)) {
    envBackup.set(key, process.env[key]);
  }
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

async function makeArchive(
  files: Array<{ path: string; content: string }>,
): Promise<Buffer> {
  const pack = tar.pack();
  for (const file of files) {
    pack.entry({ name: file.path }, file.content);
  }
  pack.finalize();
  const chunks: Buffer[] = [];
  for await (const chunk of pack) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return zlib.gzipSync(Buffer.concat(chunks));
}

function sha256(buffer: Buffer) {
  return `sha256:${crypto.createHash('sha256').update(buffer).digest('hex')}`;
}

async function startRegistry(): Promise<RemoteRegistry> {
  const state: RemoteRegistryState = {
    skills: [],
    archives: new Map(),
    archiveStatusByPath: new Map(),
    hits: {},
  };

  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    state.hits[requestUrl.pathname] =
      (state.hits[requestUrl.pathname] ?? 0) + 1;

    const send = () => {
      if (
        state.authToken !== undefined &&
        request.headers.authorization !== `Bearer ${state.authToken}`
      ) {
        response.writeHead(401, { 'content-type': 'text/plain' });
        response.end('unauthorized');
        return;
      }

      if (requestUrl.pathname === '/v1/index.json') {
        if (state.indexStatus !== undefined && state.indexStatus !== 200) {
          response.writeHead(state.indexStatus, {
            'content-type': 'text/plain',
          });
          response.end(`index error ${state.indexStatus}`);
          return;
        }
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(
          state.indexBody ??
            JSON.stringify({
              skills: state.skills,
            }),
        );
        return;
      }

      if (requestUrl.pathname.startsWith('/v1/archives/')) {
        const status = state.archiveStatusByPath.get(requestUrl.pathname);
        if (status !== undefined) {
          response.writeHead(status, { 'content-type': 'text/plain' });
          response.end(`archive error ${status}`);
          return;
        }
        const archive = state.archives.get(requestUrl.pathname);
        if (!archive) {
          response.writeHead(404, { 'content-type': 'text/plain' });
          response.end('missing archive');
          return;
        }
        response.writeHead(200, { 'content-type': 'application/gzip' });
        response.end(archive);
        return;
      }

      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('not found');
    };

    if (state.delayMs !== undefined && state.delayMs > 0) {
      setTimeout(send, state.delayMs);
    } else {
      send();
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Could not resolve registry address.');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}/v1/`,
    state,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };
}

async function addRemoteSkill(
  registry: RemoteRegistry,
  input: {
    key: string;
    version?: string;
    files?: Array<{ path: string; content: string }>;
    archivePath?: string;
    archiveBuffer?: Buffer;
    digest?: string;
  },
) {
  const archivePath = input.archivePath ?? `/v1/archives/${input.key}.tar.gz`;
  const archiveBuffer =
    input.archiveBuffer ??
    (await makeArchive(
      input.files ?? [
        { path: 'SKILL.md', content: `# ${input.key}\n` },
        { path: 'notes.txt', content: 'remote skill\n' },
      ],
    ));
  registry.state.archives.set(archivePath, archiveBuffer);
  registry.state.skills.push({
    key: input.key,
    version: input.version ?? '1.0.0',
    digest: input.digest ?? sha256(archiveBuffer),
    archiveUrl: archivePath,
  });
}

function remoteSource(
  baseUrl: string,
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    type: 'remote',
    url: baseUrl,
    auth: { type: 'none' },
    refreshTtlSeconds: 300,
    requestTimeoutSeconds: 1,
    integrity: 'required',
    ...overrides,
  };
}

describe('remote sources', () => {
  it('syncs a remote winner and reuses the cached object on later runs', async () => {
    const registry = await startRegistry();
    const root = await makeTempDir('skilldir-remote-cache-');
    const output = path.join(root, 'output');
    setEnv('SKILLDIR_CACHE_DIR', path.join(root, 'cache'));

    try {
      await addRemoteSkill(registry, { key: 'playwright' });

      const resultA = await runSync({
        sources: [remoteSource(registry.baseUrl)],
        output,
      });
      const targetA = await readSymlinkTarget(path.join(output, 'playwright'));
      expect(targetA).toContain(path.join('cache', 'objects', 'sha256-'));
      expect(registry.state.hits['/v1/archives/playwright.tar.gz']).toBe(1);
      expect(resultA.resolved.get('playwright')?.winner.remote?.sourceUrl).toBe(
        registry.baseUrl,
      );

      const resultB = await runSync({
        sources: [remoteSource(registry.baseUrl)],
        output,
      });
      const targetB = await readSymlinkTarget(path.join(output, 'playwright'));
      expect(targetB).toBe(targetA);
      expect(registry.state.hits['/v1/archives/playwright.tar.gz']).toBe(1);
      expect(resultB.warnings).toEqual([]);
    } finally {
      await registry.close();
    }
  });

  it('lets source order decide between local and remote candidates for the same key', async () => {
    const registry = await startRegistry();
    const root = await makeTempDir('skilldir-remote-order-');
    const local = path.join(root, 'local');
    const output = path.join(root, 'output');
    setEnv('SKILLDIR_CACHE_DIR', path.join(root, 'cache'));

    try {
      await addRemoteSkill(registry, { key: 'playwright' });
      await fs.mkdir(path.join(local, 'playwright'), { recursive: true });
      await fs.writeFile(
        path.join(local, 'playwright', 'SKILL.md'),
        '# local\n',
        'utf8',
      );

      const localWins = await runSync({
        sources: [local, remoteSource(registry.baseUrl)],
        output,
      });
      expect(localWins.resolved.get('playwright')?.winner.dir).toBe(
        path.join(local, 'playwright'),
      );
      expect(registry.state.hits['/v1/archives/playwright.tar.gz'] ?? 0).toBe(
        0,
      );

      const remoteWins = await runSync({
        sources: [remoteSource(registry.baseUrl), local],
        output,
      });
      expect(
        remoteWins.resolved.get('playwright')?.winner.remote?.sourceUrl,
      ).toBe(registry.baseUrl);
      expect(registry.state.hits['/v1/archives/playwright.tar.gz']).toBe(1);
    } finally {
      await registry.close();
    }
  });

  it('prunes stale cached objects when a remote index removes them', async () => {
    const registry = await startRegistry();
    const root = await makeTempDir('skilldir-remote-prune-');
    const output = path.join(root, 'output');
    const cacheRoot = path.join(root, 'cache');
    setEnv('SKILLDIR_CACHE_DIR', cacheRoot);

    try {
      await addRemoteSkill(registry, { key: 'playwright' });
      await runSync({
        sources: [remoteSource(registry.baseUrl, { refreshTtlSeconds: 0 })],
        output,
      });
      const objectsBefore = await fs.readdir(path.join(cacheRoot, 'objects'));
      expect(objectsBefore).toHaveLength(1);

      registry.state.skills = [];
      await runSync({
        sources: [remoteSource(registry.baseUrl, { refreshTtlSeconds: 0 })],
        output,
      });

      const objectsAfter = await fs.readdir(path.join(cacheRoot, 'objects'));
      expect(objectsAfter).toHaveLength(0);
    } finally {
      await registry.close();
    }
  });

  it('falls back to stale cached index and object content when the registry becomes unavailable', async () => {
    const registry = await startRegistry();
    const root = await makeTempDir('skilldir-remote-stale-');
    const output = path.join(root, 'output');
    setEnv('SKILLDIR_CACHE_DIR', path.join(root, 'cache'));

    try {
      await addRemoteSkill(registry, { key: 'playwright' });
      await runSync({
        sources: [remoteSource(registry.baseUrl, { refreshTtlSeconds: 1 })],
        output,
      });

      registry.state.indexStatus = 503;
      registry.state.archives.clear();

      const result = await runSync({
        sources: [remoteSource(registry.baseUrl, { refreshTtlSeconds: 0 })],
        output,
      });

      expect(
        result.warnings.some(
          (warning) =>
            warning.code === 'remote-warning' &&
            warning.source === registry.baseUrl &&
            warning.message.includes('using stale cached index: HTTP 503'),
        ),
      ).toBe(true);
      expect(
        await readSymlinkTarget(path.join(output, 'playwright')),
      ).toContain(path.join('cache', 'objects', 'sha256-'));
    } finally {
      await registry.close();
    }
  });

  it('fails when required credential env is missing and doctor reports it', async () => {
    const registry = await startRegistry();
    const root = await makeTempDir('skilldir-remote-auth-missing-');
    const output = path.join(root, 'output');
    setEnv('SKILLDIR_CACHE_DIR', path.join(root, 'cache'));

    try {
      await addRemoteSkill(registry, { key: 'playwright' });
      const config = {
        sources: [
          remoteSource(registry.baseUrl, {
            auth: { type: 'bearer-env', env: 'SKILLDIR_TOKEN' },
          }),
        ],
        output,
      };

      await expect(runSync(config)).rejects.toThrow(
        `Remote source ${registry.baseUrl} requires credential env SKILLDIR_TOKEN.`,
      );
      const issues = await runDoctor(config, {
        resolved: new Map(),
        created: [],
        updated: [],
        removed: [],
        warnings: [],
      });
      expect(issues).toContainEqual({
        code: 'remote-auth-missing',
        source: registry.baseUrl,
        env: 'SKILLDIR_TOKEN',
      });
    } finally {
      await registry.close();
    }
  });

  it('fails on invalid credentials and auth errors', async () => {
    const registry = await startRegistry();
    const root = await makeTempDir('skilldir-remote-auth-error-');
    const output = path.join(root, 'output');
    setEnv('SKILLDIR_CACHE_DIR', path.join(root, 'cache'));
    registry.state.authToken = 'expected-token';
    setEnv('SKILLDIR_TOKEN', 'wrong-token');

    try {
      await addRemoteSkill(registry, { key: 'playwright' });
      const config = {
        sources: [
          remoteSource(registry.baseUrl, {
            auth: { type: 'bearer-env', env: 'SKILLDIR_TOKEN' },
          }),
        ],
        output,
      };

      await expect(runSync(config)).rejects.toThrow('HTTP 401');

      registry.state.indexStatus = 403;
      setEnv('SKILLDIR_TOKEN', 'expected-token');
      await expect(runSync(config)).rejects.toThrow('HTTP 403');
    } finally {
      await registry.close();
    }
  });

  it('fails on network timeout', async () => {
    const registry = await startRegistry();
    const root = await makeTempDir('skilldir-remote-timeout-');
    const output = path.join(root, 'output');
    setEnv('SKILLDIR_CACHE_DIR', path.join(root, 'cache'));

    try {
      await addRemoteSkill(registry, { key: 'playwright' });
      registry.state.delayMs = 1100;
      await expect(
        runSync({
          sources: [
            remoteSource(registry.baseUrl, {
              requestTimeoutSeconds: 1,
              refreshTtlSeconds: 1,
            }),
          ],
          output,
        }),
      ).rejects.toThrow();
    } finally {
      await registry.close();
    }
  });

  it('fails on malformed remote index responses', async () => {
    const registry = await startRegistry();
    const root = await makeTempDir('skilldir-remote-malformed-index-');
    const output = path.join(root, 'output');
    setEnv('SKILLDIR_CACHE_DIR', path.join(root, 'cache'));

    try {
      registry.state.indexBody = '{"skills":[{"key":1}]}';
      await expect(
        runSync({
          sources: [remoteSource(registry.baseUrl)],
          output,
        }),
      ).rejects.toThrow('invalid index schema');
    } finally {
      await registry.close();
    }
  });

  it('fails when an archive returns 404', async () => {
    const registry = await startRegistry();
    const root = await makeTempDir('skilldir-remote-404-');
    const output = path.join(root, 'output');
    setEnv('SKILLDIR_CACHE_DIR', path.join(root, 'cache'));

    try {
      registry.state.skills.push({
        key: 'playwright',
        version: '1.0.0',
        digest:
          'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        archiveUrl: '/v1/archives/missing.tar.gz',
      });
      await expect(
        runSync({
          sources: [remoteSource(registry.baseUrl)],
          output,
        }),
      ).rejects.toThrow('HTTP 404');
    } finally {
      await registry.close();
    }
  });

  it('fails on digest mismatch', async () => {
    const registry = await startRegistry();
    const root = await makeTempDir('skilldir-remote-digest-');
    const output = path.join(root, 'output');
    setEnv('SKILLDIR_CACHE_DIR', path.join(root, 'cache'));

    try {
      await addRemoteSkill(registry, {
        key: 'playwright',
        digest:
          'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      });
      await expect(
        runSync({
          sources: [remoteSource(registry.baseUrl)],
          output,
        }),
      ).rejects.toThrow('Digest mismatch');
    } finally {
      await registry.close();
    }
  });

  it('fails on corrupt and partial archives and cleans extraction temp dirs', async () => {
    const registry = await startRegistry();
    const root = await makeTempDir('skilldir-remote-corrupt-');
    const output = path.join(root, 'output');
    const cacheRoot = path.join(root, 'cache');
    setEnv('SKILLDIR_CACHE_DIR', cacheRoot);

    try {
      await addRemoteSkill(registry, {
        key: 'corrupt',
        archivePath: '/v1/archives/corrupt.tar.gz',
        archiveBuffer: Buffer.from('not-a-gzip'),
        digest: sha256(Buffer.from('not-a-gzip')),
      });
      await expect(
        runSync({
          sources: [remoteSource(registry.baseUrl)],
          output,
        }),
      ).rejects.toThrow();

      registry.state.skills = [];
      registry.state.archives.clear();
      const goodArchive = await makeArchive([
        { path: 'SKILL.md', content: '# playwright\n' },
      ]);
      const partialArchive = goodArchive.subarray(
        0,
        Math.floor(goodArchive.length / 2),
      );
      await addRemoteSkill(registry, {
        key: 'partial',
        archivePath: '/v1/archives/partial.tar.gz',
        archiveBuffer: partialArchive,
        digest: sha256(partialArchive),
      });
      await expect(
        runSync({
          sources: [remoteSource(registry.baseUrl)],
          output,
        }),
      ).rejects.toThrow();

      const objectsRoot = path.join(cacheRoot, 'objects');
      const objectEntries = await fs.readdir(objectsRoot).catch(() => []);
      expect(objectEntries.some((entry) => entry.includes('.tmp-'))).toBe(
        false,
      );
    } finally {
      await registry.close();
    }
  });

  it('rejects path traversal archives', async () => {
    const registry = await startRegistry();
    const root = await makeTempDir('skilldir-remote-traversal-');
    const output = path.join(root, 'output');
    const cacheRoot = path.join(root, 'cache');
    setEnv('SKILLDIR_CACHE_DIR', cacheRoot);

    try {
      const traversalArchive = await makeArchive([
        { path: '../escape.txt', content: 'owned\n' },
        { path: 'SKILL.md', content: '# bad\n' },
      ]);
      await addRemoteSkill(registry, {
        key: 'evil',
        archivePath: '/v1/archives/evil.tar.gz',
        archiveBuffer: traversalArchive,
      });

      await expect(
        runSync({
          sources: [remoteSource(registry.baseUrl)],
          output,
        }),
      ).rejects.toThrow('escapes the destination root');

      await expect(
        fs.access(path.join(cacheRoot, 'escape.txt')),
      ).rejects.toThrow();
    } finally {
      await registry.close();
    }
  });

  it('renders remote origin metadata in status JSON', async () => {
    const registry = await startRegistry();
    const root = await makeTempDir('skilldir-remote-status-');
    const output = path.join(root, 'output');
    setEnv('SKILLDIR_CACHE_DIR', path.join(root, 'cache'));

    try {
      await addRemoteSkill(registry, { key: 'playwright', version: '2.0.0' });
      const result = await runSync({
        sources: [remoteSource(registry.baseUrl)],
        output,
      });
      const parsed = JSON.parse(renderStatusJson(result)) as {
        resolved: Array<{
          name: string;
          winnerRemote: null | {
            sourceUrl: string;
            version: string;
            digest: string;
          };
        }>;
      };
      expect(parsed.resolved[0]?.name).toBe('playwright');
      expect(parsed.resolved[0]?.winnerRemote?.sourceUrl).toBe(
        registry.baseUrl,
      );
      expect(parsed.resolved[0]?.winnerRemote?.version).toBe('2.0.0');
      expect(parsed.resolved[0]?.winnerRemote?.digest).toMatch(/^sha256:/u);
    } finally {
      await registry.close();
    }
  });

  it('reports remote cache corruption in doctor', async () => {
    const registry = await startRegistry();
    const root = await makeTempDir('skilldir-remote-doctor-cache-');
    const output = path.join(root, 'output');
    const cacheRoot = path.join(root, 'cache');
    setEnv('SKILLDIR_CACHE_DIR', cacheRoot);

    try {
      await addRemoteSkill(registry, { key: 'playwright' });
      const config = {
        sources: [remoteSource(registry.baseUrl)],
        output,
      };
      const result = await runSync(config);
      const loadedConfig = await loadConfig(
        await (async () => {
          const configPath = path.join(root, 'config.json');
          await fs.writeFile(
            configPath,
            JSON.stringify(config, null, 2),
            'utf8',
          );
          return configPath;
        })(),
      );

      const sourceHash = crypto
        .createHash('sha256')
        .update(registry.baseUrl)
        .digest('hex');
      await fs.writeFile(
        path.join(cacheRoot, 'sources', sourceHash, 'index.json'),
        '{bad-json',
        'utf8',
      );

      const issues = await runDoctor(loadedConfig, result);
      expect(
        issues.some((issue) => issue.code === 'remote-cache-corrupt'),
      ).toBe(true);
    } finally {
      await registry.close();
    }
  });
});
