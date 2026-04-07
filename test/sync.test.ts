import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runSync } from '../src/sync.js';
import { createSkill, makeTempDir, readSymlinkTarget } from './helpers.js';

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
});
