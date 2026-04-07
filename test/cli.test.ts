import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { acquireOutputLock } from '../src/lock.js';
import { createSkill, makeTempDir, writeConfig } from './helpers.js';

function runCli(args: string[], cwd: string) {
  const tsxPath = path.join(cwd, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  return spawnSync(process.execPath, [tsxPath, 'src/cli.ts', ...args], {
    cwd,
    encoding: 'utf8',
  });
}

describe('cli', () => {
  it('renders status --json', async () => {
    const repoRoot = path.resolve(__dirname, '..');
    const root = await makeTempDir('skilldir-cli-status-');
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    const configPath = path.join(root, 'config.json');

    await createSkill(source, 'playwright');
    await writeConfig(configPath, { sources: [source], output });

    const result = runCli(['status', '--config', configPath, '--json'], repoRoot);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      resolved: Array<{ name: string }>;
    };
    expect(parsed.resolved[0]?.name).toBe('playwright');
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

    const result = runCli(['doctor', '--config', configPath, '--json'], repoRoot);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout) as {
      issues: Array<{ code: string }>;
      count: number;
    };
    expect(parsed.count).toBeGreaterThan(0);
    expect(parsed.issues.some((issue) => issue.code === 'unmanaged-output-entry')).toBe(true);
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
});
