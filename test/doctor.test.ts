import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderDoctorJson, runDoctor } from '../src/doctor.js';
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

  it('renders JSON output with a stable count', async () => {
    const root = await makeTempDir('skilldir-doctor-json-');
    const source = path.join(root, 'a');
    const output = path.join(root, 'out');
    await createSkill(source, 'playwright');
    await fs.mkdir(path.join(output, 'manual'), { recursive: true });

    const issues = await runDoctor(
      { sources: [source], output },
      await runSync({ sources: [source], output }),
    );

    const parsed = JSON.parse(renderDoctorJson(issues)) as {
      issues: Array<{ code: string }>;
      count: number;
    };

    expect(parsed.count).toBe(parsed.issues.length);
    expect(parsed.issues[0]?.code).toBe('unmanaged-output-entry');
  });
});
