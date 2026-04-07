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

  it('follows a symlinked source root', async () => {
    const root = await makeTempDir('skilldir-discover-source-link-');
    const realSource = path.join(root, 'real-source');
    const linkedSource = path.join(root, 'linked-source');
    const output = path.join(root, 'output');
    await createSkill(realSource, 'playwright');
    await fs.symlink(realSource, linkedSource);

    const entries = await discoverSkills({ sources: [linkedSource], output });

    expect(entries.map((entry) => entry.name)).toEqual(['playwright']);
    expect(entries[0]?.source).toBe(path.resolve(linkedSource));
  });

  it('follows symlinked skill directories inside a source', async () => {
    const root = await makeTempDir('skilldir-discover-skill-link-');
    const source = path.join(root, 'source');
    const library = path.join(root, 'library');
    const output = path.join(root, 'output');
    const realSkill = await createSkill(library, 'playwright');
    await fs.mkdir(source, { recursive: true });
    await fs.symlink(realSkill, path.join(source, 'playwright'));

    const entries = await discoverSkills({ sources: [source], output });

    expect(entries.map((entry) => entry.name)).toEqual(['playwright']);
    expect(entries[0]?.dir).toBe(path.join(source, 'playwright'));
  });

  it('keeps valid skill names with spaces and punctuation', async () => {
    const root = await makeTempDir('skilldir-discover-punctuation-');
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    await createSkill(source, 'playwright tools!');

    const entries = await discoverSkills({ sources: [source], output });

    expect(entries.map((entry) => entry.name)).toEqual(['playwright tools!']);
  });
});
