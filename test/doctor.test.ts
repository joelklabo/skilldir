import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderDoctor, renderDoctorJson, runDoctor } from '../src/doctor.js';
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

  it('renders human output deterministically', async () => {
    const root = await makeTempDir('skilldir-doctor-text-');
    const sourceA = path.join(root, 'a');
    const sourceB = path.join(root, 'b');
    const output = path.join(root, 'out');
    await createSkill(sourceA, 'playwright');
    await createSkill(sourceB, 'playwright');
    await fs.mkdir(path.join(output, 'manual'), { recursive: true });

    const issues = await runDoctor(
      { sources: [sourceA, sourceB], output },
      await runSync({ sources: [sourceA, sourceB], output }),
    );

    const normalized = renderDoctor(issues).replaceAll(
      root,
      '/tmp/skilldir-doctor-text-IGNORE',
    );

    expect(normalized).toMatchInlineSnapshot(`
      "doctor: 2 issue(s)
      shadowed skill: playwright winner=/tmp/skilldir-doctor-text-IGNORE/a/playwright shadowed=/tmp/skilldir-doctor-text-IGNORE/b/playwright
      unmanaged output entry: /tmp/skilldir-doctor-text-IGNORE/out/manual"
    `);
  });

  it('renders JSON output deterministically', async () => {
    const root = await makeTempDir('skilldir-doctor-json-snapshot-');
    const sourceA = path.join(root, 'a');
    const sourceB = path.join(root, 'b');
    const output = path.join(root, 'out');
    await createSkill(sourceA, 'playwright');
    await createSkill(sourceB, 'playwright');
    await fs.mkdir(path.join(output, 'manual'), { recursive: true });

    const issues = await runDoctor(
      { sources: [sourceA, sourceB], output },
      await runSync({ sources: [sourceA, sourceB], output }),
    );

    const normalized = renderDoctorJson(issues).replaceAll(
      root,
      '/tmp/skilldir-doctor-json-snapshot-IGNORE',
    );
    expect(normalized).toMatchInlineSnapshot(`
      "{
        "schemaVersion": 1,
        "issues": [
          {
            "code": "shadowed-skill",
            "skill": "playwright",
            "winner": "/tmp/skilldir-doctor-json-snapshot-IGNORE/a/playwright",
            "shadowed": "/tmp/skilldir-doctor-json-snapshot-IGNORE/b/playwright"
          },
          {
            "code": "unmanaged-output-entry",
            "path": "/tmp/skilldir-doctor-json-snapshot-IGNORE/out/manual"
          }
        ],
        "count": 2
      }"
    `);
  });
});
