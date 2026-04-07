import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { acquireOutputLock } from '../src/lock.js';
import { createSkill, makeTempDir, writeConfig } from './helpers.js';

let builtCliReady = false;

function runCli(args: string[], cwd: string) {
  const tsxPath = path.join(cwd, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  return spawnSync(process.execPath, [tsxPath, 'src/cli.ts', ...args], {
    cwd,
    encoding: 'utf8',
  });
}

function runBuiltCli(args: string[], cwd: string) {
  return spawnSync(
    process.execPath,
    [path.join(cwd, 'dist', 'cli.js'), ...args],
    {
      cwd,
      encoding: 'utf8',
    },
  );
}

function ensureBuilt(cwd: string) {
  if (builtCliReady) return;
  const result = spawnSync('pnpm', ['build'], {
    cwd,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'pnpm build failed');
  }
  builtCliReady = true;
}

describe('cli', () => {
  it('renders top-level help with examples', () => {
    const repoRoot = path.resolve(__dirname, '..');
    const result = runCli(['--help'], repoRoot);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('skilldir sync --config ./skilldir.json');
    expect(result.stdout).toContain('skilldir watch --config ./skilldir.json');
  });

  it('renders per-command help with examples', () => {
    const repoRoot = path.resolve(__dirname, '..');
    const result = runCli(['status', '--help'], repoRoot);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('skilldir status --config ./skilldir.json');
    expect(result.stdout).toContain('--json');
  });

  it('renders status --json', async () => {
    const repoRoot = path.resolve(__dirname, '..');
    const root = await makeTempDir('skilldir-cli-status-');
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    const configPath = path.join(root, 'config.json');

    await createSkill(source, 'playwright');
    await writeConfig(configPath, { sources: [source], output });

    const result = runCli(
      ['status', '--config', configPath, '--json'],
      repoRoot,
    );
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      resolved: Array<{ name: string }>;
    };
    expect(parsed.resolved[0]?.name).toBe('playwright');
  });

  it('suppresses normal sync output with --quiet', async () => {
    const repoRoot = path.resolve(__dirname, '..');
    const root = await makeTempDir('skilldir-cli-quiet-');
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    const configPath = path.join(root, 'config.json');

    await createSkill(source, 'playwright');
    await writeConfig(configPath, { sources: [source], output });

    const result = runCli(
      ['sync', '--config', configPath, '--quiet'],
      repoRoot,
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('prints manual trigger diagnostics with sync --verbose', async () => {
    const repoRoot = path.resolve(__dirname, '..');
    const root = await makeTempDir('skilldir-cli-verbose-');
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    const configPath = path.join(root, 'config.json');

    await createSkill(source, 'playwright');
    await writeConfig(configPath, { sources: [source], output });

    const result = runCli(
      ['sync', '--config', configPath, '--verbose'],
      repoRoot,
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('sync: trigger=manual');
    expect(result.stdout).toContain('summary: 1 resolved');
  });

  it('renders doctor --json and exits non-zero when issues exist', async () => {
    const repoRoot = path.resolve(__dirname, '..');
    const root = await makeTempDir('skilldir-cli-doctor-');
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    const configPath = path.join(root, 'config.json');

    await createSkill(source, 'playwright');
    await fs.mkdir(path.join(output, 'manual'), { recursive: true });
    await writeConfig(configPath, { sources: [source], output });

    const result = runCli(
      ['doctor', '--config', configPath, '--json'],
      repoRoot,
    );
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout) as {
      issues: Array<{ code: string }>;
      count: number;
    };
    expect(parsed.count).toBeGreaterThan(0);
    expect(
      parsed.issues.some((issue) => issue.code === 'unmanaged-output-entry'),
    ).toBe(true);
  });

  it('exits non-zero for missing config files', () => {
    const repoRoot = path.resolve(__dirname, '..');
    const result = runCli(
      ['status', '--config', '/definitely/missing/skilldir-config.json'],
      repoRoot,
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('ENOENT');
  });

  it('fails cleanly when another sync holds the output lock', async () => {
    const repoRoot = path.resolve(__dirname, '..');
    const root = await makeTempDir('skilldir-cli-lock-');
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    const configPath = path.join(root, 'config.json');

    await createSkill(source, 'playwright');
    await writeConfig(configPath, { sources: [source], output });

    const lock = await acquireOutputLock(output);

    const second = runCli(['sync', '--config', configPath], repoRoot);
    expect(second.status).toBe(1);
    expect(second.stderr).toContain('already locked');

    await lock.release();
  });

  it('invokes the built binary successfully', async () => {
    const repoRoot = path.resolve(__dirname, '..');
    ensureBuilt(repoRoot);

    const root = await makeTempDir('skilldir-cli-built-');
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    const configPath = path.join(root, 'config.json');

    await createSkill(source, 'playwright');
    await writeConfig(configPath, { sources: [source], output });

    const result = runBuiltCli(
      ['status', '--config', configPath, '--json'],
      repoRoot,
    );
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      schemaVersion: number;
      resolved: Array<{ name: string }>;
    };
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.resolved[0]?.name).toBe('playwright');
  });
});
