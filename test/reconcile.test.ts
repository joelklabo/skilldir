import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { reconcileOutput } from '../src/reconcile.js';
import { resolveSkills } from '../src/resolve.js';
import { createSkill, makeTempDir } from './helpers.js';

describe('reconcileOutput', () => {
  it('creates and updates managed symlinks, and preserves unmanaged entries', async () => {
    const root = await makeTempDir('skilldir-reconcile-');
    const output = path.join(root, 'output');
    const sourceA = path.join(root, 'a');
    const sourceB = path.join(root, 'b');
    const playwrightA = await createSkill(sourceA, 'playwright');
    const playwrightB = await createSkill(sourceB, 'playwright');
    await fs.mkdir(output, { recursive: true });
    await fs.mkdir(path.join(output, 'manual'), { recursive: true });

    const first = await reconcileOutput({
      output,
      resolved: resolveSkills([
        {
          name: 'playwright',
          dir: playwrightA,
          skillFile: path.join(playwrightA, 'SKILL.md'),
          source: sourceA,
          sourceIndex: 0,
        },
      ]),
    });
    expect(first.created).toEqual(['playwright']);
    expect(await fs.readlink(path.join(output, 'playwright'))).toBe(
      playwrightA,
    );

    const second = await reconcileOutput({
      output,
      resolved: resolveSkills([
        {
          name: 'playwright',
          dir: playwrightB,
          skillFile: path.join(playwrightB, 'SKILL.md'),
          source: sourceB,
          sourceIndex: 0,
        },
      ]),
    });
    expect(second.updated).toEqual(['playwright']);
    expect(await fs.readlink(path.join(output, 'playwright'))).toBe(
      playwrightB,
    );
    expect((await fs.stat(path.join(output, 'manual'))).isDirectory()).toBe(
      true,
    );
  });

  it('removes stale managed symlinks', async () => {
    const root = await makeTempDir('skilldir-reconcile-remove-');
    const output = path.join(root, 'output');
    const source = path.join(root, 'source');
    const playwright = await createSkill(source, 'playwright');
    await reconcileOutput({
      output,
      resolved: resolveSkills([
        {
          name: 'playwright',
          dir: playwright,
          skillFile: path.join(playwright, 'SKILL.md'),
          source,
          sourceIndex: 0,
        },
      ]),
    });
    const result = await reconcileOutput({ output, resolved: new Map() });
    expect(result.removed).toEqual(['playwright']);
    await expect(fs.lstat(path.join(output, 'playwright'))).rejects.toThrow();
  });

  it('retargets a broken managed symlink when the desired winner changes', async () => {
    const root = await makeTempDir('skilldir-reconcile-broken-');
    const output = path.join(root, 'output');
    const sourceA = path.join(root, 'a');
    const sourceB = path.join(root, 'b');
    const current = await createSkill(sourceA, 'playwright');
    const next = await createSkill(sourceB, 'playwright');

    await reconcileOutput({
      output,
      resolved: resolveSkills([
        {
          name: 'playwright',
          dir: current,
          skillFile: path.join(current, 'SKILL.md'),
          source: sourceA,
          sourceIndex: 0,
        },
      ]),
    });

    await fs.rm(current, { recursive: true, force: true });

    const result = await reconcileOutput({
      output,
      resolved: resolveSkills([
        {
          name: 'playwright',
          dir: next,
          skillFile: path.join(next, 'SKILL.md'),
          source: sourceB,
          sourceIndex: 0,
        },
      ]),
    });

    expect(result.updated).toEqual(['playwright']);
    expect(await fs.readlink(path.join(output, 'playwright'))).toBe(next);
  });

  it('warns when an unmanaged symlink blocks the desired skill name', async () => {
    const root = await makeTempDir('skilldir-reconcile-unmanaged-link-');
    const output = path.join(root, 'output');
    const source = path.join(root, 'source');
    const other = path.join(root, 'other');
    const desired = await createSkill(source, 'playwright');
    const unmanaged = await createSkill(other, 'playwright-manual');

    await fs.mkdir(output, { recursive: true });
    await fs.symlink(unmanaged, path.join(output, 'playwright'));

    const result = await reconcileOutput({
      output,
      resolved: resolveSkills([
        {
          name: 'playwright',
          dir: desired,
          skillFile: path.join(desired, 'SKILL.md'),
          source,
          sourceIndex: 0,
        },
      ]),
    });

    expect(result.warnings).toEqual([
      {
        code: 'conflicting-unmanaged-entry',
        skill: 'playwright',
        path: path.join(output, 'playwright'),
        expectedTarget: desired,
      },
    ]);
    expect(await fs.readlink(path.join(output, 'playwright'))).toBe(unmanaged);
  });
});
