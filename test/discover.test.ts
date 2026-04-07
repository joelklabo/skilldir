import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { discoverSkills } from '../src/discover.js';
import { createSkill, makeTempDir } from './helpers.js';

describe('discoverSkills', () => {
  it('finds skill directories containing SKILL.md', async () => {
    const root = await makeTempDir('skilldir-discover-');
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    await createSkill(source, 'playwright');
    const entries = await discoverSkills({ sources: [source], output });
    expect(entries.map((entry) => entry.name)).toEqual(['playwright']);
  });

  it('ignores node_modules and .git', async () => {
    const root = await makeTempDir('skilldir-discover-ignore-');
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    await createSkill(path.join(source, 'node_modules'), 'bad-one');
    await createSkill(path.join(source, '.git'), 'bad-two');
    await createSkill(source, 'good-one');
    const entries = await discoverSkills({ sources: [source], output });
    expect(entries.map((entry) => entry.name)).toEqual(['good-one']);
  });

  it('does not recurse into the output directory', async () => {
    const root = await makeTempDir('skilldir-discover-output-');
    const source = path.join(root, 'source');
    const output = path.join(source, '.agents', 'skills');
    await fs.mkdir(output, { recursive: true });
    await createSkill(output, 'generated');
    await createSkill(source, 'real');
    const entries = await discoverSkills({ sources: [source], output });
    expect(entries.map((entry) => entry.name)).toEqual(['real']);
  });
});
