import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runSync } from '../src/sync.js';
import {
  copyFixtureTree,
  createSkill,
  makeTempDir,
  readSymlinkTarget,
  writeConfig,
} from './helpers.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe('runSync', () => {
  it('builds a first-source-wins union and returns status data', async () => {
    const root = await makeTempDir('skilldir-sync-');
    tempDirs.push(root);
    const sourceA = path.join(root, 'source-a');
    const sourceB = path.join(root, 'source-b');
    const output = path.join(root, 'output');
    const playwrightA = await createSkill(sourceA, 'playwright');
    await createSkill(sourceB, 'playwright');
    await createSkill(sourceB, 'pdf');

    const result = await runSync({
      sources: [sourceA, sourceB],
      output,
    });

    expect(result.resolved.get('playwright')?.winner.dir).toBe(playwrightA);
    expect(result.resolved.get('playwright')?.shadowed.length).toBe(1);
    expect(await readSymlinkTarget(path.join(output, 'playwright'))).toBe(
      playwrightA,
    );
    expect(await readSymlinkTarget(path.join(output, 'pdf'))).toBe(
      path.join(sourceB, 'pdf'),
    );
  });

  it('retargets winners when source order changes between sync runs', async () => {
    const root = await makeTempDir('skilldir-sync-precedence-');
    tempDirs.push(root);
    const sourceA = path.join(root, 'source-a');
    const sourceB = path.join(root, 'source-b');
    const output = path.join(root, 'output');
    const playwrightA = await createSkill(sourceA, 'playwright');
    const playwrightB = await createSkill(sourceB, 'playwright');

    const first = await runSync({
      sources: [sourceA, sourceB],
      output,
    });
    expect(first.created).toEqual(['playwright']);
    expect(await readSymlinkTarget(path.join(output, 'playwright'))).toBe(
      playwrightA,
    );

    const second = await runSync({
      sources: [sourceB, sourceA],
      output,
    });
    expect(second.updated).toEqual(['playwright']);
    expect(await readSymlinkTarget(path.join(output, 'playwright'))).toBe(
      playwrightB,
    );
    expect(second.resolved.get('playwright')?.winner.dir).toBe(playwrightB);
  });

  it('handles a nested output directory beneath a source tree', async () => {
    const root = await makeTempDir('skilldir-sync-nested-output-');
    tempDirs.push(root);
    const source = path.join(root, 'source');
    const output = path.join(source, '.agents', 'skills');

    await createSkill(source, 'repo-skill');
    await fs.mkdir(output, { recursive: true });

    const result = await runSync({
      sources: [source],
      output,
    });

    expect(result.resolved.get('repo-skill')?.winner.dir).toBe(
      path.join(source, 'repo-skill'),
    );
    expect(await readSymlinkTarget(path.join(output, 'repo-skill'))).toBe(
      path.join(source, 'repo-skill'),
    );
  });

  it('resolves the same skill key across project, codex, and claude fixture trees', async () => {
    const root = await copyFixtureTree('harnesses', 'skilldir-harnesses-');
    tempDirs.push(root);

    const projectSkills = path.join(root, 'project', '.agents', 'skills');
    const codexSkills = path.join(root, 'codex-home', '.codex', 'skills');
    const claudeSkills = path.join(root, 'claude-home', '.claude', 'skills');
    const output = path.join(root, 'output');

    const result = await runSync({
      sources: [projectSkills, codexSkills, claudeSkills],
      output,
    });

    expect(result.resolved.get('playwright')?.winner.dir).toBe(
      path.join(projectSkills, 'playwright'),
    );
    expect(
      result.resolved.get('playwright')?.shadowed.map((entry) => entry.dir),
    ).toEqual([
      path.join(codexSkills, 'playwright'),
      path.join(claudeSkills, 'playwright'),
    ]);
    expect(await readSymlinkTarget(path.join(output, 'playwright'))).toBe(
      path.join(projectSkills, 'playwright'),
    );
    expect(await readSymlinkTarget(path.join(output, 'codex-only'))).toBe(
      path.join(codexSkills, 'codex-only'),
    );
    expect(await readSymlinkTarget(path.join(output, 'claude-only'))).toBe(
      path.join(claudeSkills, 'claude-only'),
    );
    expect(await readSymlinkTarget(path.join(output, 'repo-only'))).toBe(
      path.join(projectSkills, 'repo-only'),
    );
  });

  it('rejects a concurrent sync process while another sync holds the output lock', async () => {
    const repoRoot = path.resolve(__dirname, '..');
    const root = await makeTempDir('skilldir-sync-concurrent-');
    tempDirs.push(root);
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    const configPath = path.join(root, 'config.json');

    await createSkill(source, 'playwright');
    await writeConfig(configPath, { sources: [source], output });

    const tsxPath = path.join(
      repoRoot,
      'node_modules',
      'tsx',
      'dist',
      'cli.mjs',
    );
    const scriptPath = path.join(repoRoot, 'test', 'fixtures', 'run-sync.ts');

    const first = spawn(process.execPath, [tsxPath, scriptPath, configPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        SKILLDIR_TEST_SYNC_DELAY_MS: '400',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const second = await new Promise<{ code: number | null; stderr: string }>(
      (resolve) => {
        const child = spawn(
          process.execPath,
          [tsxPath, scriptPath, configPath],
          {
            cwd: repoRoot,
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );
        let stderr = '';
        child.stderr.on('data', (chunk) => {
          stderr += String(chunk);
        });
        child.on('exit', (code) => resolve({ code, stderr }));
      },
    );

    expect(second.code).not.toBe(0);
    expect(second.stderr).toContain('already locked');

    await new Promise<void>((resolve, reject) => {
      first.on('exit', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(new Error(`first sync exited with code ${String(code)}`));
      });
    });
  });
});
