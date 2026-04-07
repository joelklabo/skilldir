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

  it('skips unreadable directories instead of failing the scan', async () => {
    const root = await makeTempDir('skilldir-discover-unreadable-');
    const source = path.join(root, 'source');
    const unreadable = path.join(source, 'private');
    const output = path.join(root, 'output');
    await createSkill(source, 'good-one');
    await createSkill(unreadable, 'bad-one');

    await fs.chmod(unreadable, 0o000);
    try {
      const entries = await discoverSkills({ sources: [source], output });
      expect(entries.map((entry) => entry.name)).toEqual(['good-one']);
    } finally {
      await fs.chmod(unreadable, 0o755);
    }
  });

  it('scans deeply nested skill trees without a depth limit', async () => {
    const root = await makeTempDir('skilldir-discover-deep-');
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    const deepRoot = path.join(source, 'a', 'b', 'c', 'd', 'e', 'f');
    await createSkill(deepRoot, 'deep-skill');

    const entries = await discoverSkills({ sources: [source], output });

    expect(entries.map((entry) => entry.name)).toEqual(['deep-skill']);
  });

  it('scans hidden directories other than .git', async () => {
    const root = await makeTempDir('skilldir-discover-hidden-');
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    await createSkill(path.join(source, '.hidden'), 'secret-skill');

    const entries = await discoverSkills({ sources: [source], output });

    expect(entries.map((entry) => entry.name)).toEqual(['secret-skill']);
  });

  it('keeps distinct case-sensitive skill names when the filesystem allows them', async () => {
    const root = await makeTempDir('skilldir-discover-case-');
    const source = path.join(root, 'source');
    const output = path.join(root, 'output');
    await createSkill(source, 'Playwright');
    await createSkill(source, 'playwright');

    const entries = await discoverSkills({ sources: [source], output });
    const names = entries.map((entry) => entry.name).sort();

    expect(names).toEqual(['Playwright', 'playwright']);
  });
});
