import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runDoctor } from '../src/doctor.js';
import { runSync } from '../src/sync.js';
import { createSkill, makeTempDir } from './helpers.js';

describe('doctor', () => {
  it('reports shadowed skills and unmanaged output entries', async () => {
    const root = await makeTempDir('skilldir-doctor-');
    const sourceA = path.join(root, 'a');
    const sourceB = path.join(root, 'b');
    const output = path.join(root, 'out');
    await createSkill(sourceA, 'playwright');
    await createSkill(sourceB, 'playwright');
    await fs.mkdir(path.join(output, 'manual'), { recursive: true });
    const config = { sources: [sourceA, sourceB], output };
    const result = await runSync(config);
    const issues = await runDoctor(config, result);
    expect(issues.some((issue) => issue.code === 'shadowed-skill')).toBe(true);
    expect(
      issues.some((issue) => issue.code === 'unmanaged-output-entry'),
    ).toBe(true);
  });
});
