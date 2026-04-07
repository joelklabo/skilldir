import { describe, expect, it } from 'vitest';
import { resolveSkills } from '../src/resolve.js';
import { SkillDirEntry } from '../src/types.js';

describe('resolveSkills', () => {
  it('uses first source wins and keeps shadowed entries', () => {
    const entries: SkillDirEntry[] = [
      {
        name: 'playwright',
        dir: '/a/playwright',
        skillFile: '/a/playwright/SKILL.md',
        source: '/a',
        sourceIndex: 0,
      },
      {
        name: 'playwright',
        dir: '/b/playwright',
        skillFile: '/b/playwright/SKILL.md',
        source: '/b',
        sourceIndex: 1,
      },
      {
        name: 'docs',
        dir: '/b/docs',
        skillFile: '/b/docs/SKILL.md',
        source: '/b',
        sourceIndex: 1,
      },
    ];
    const resolved = resolveSkills(entries);
    expect(resolved.get('playwright')?.winner.dir).toBe('/a/playwright');
    expect(
      resolved.get('playwright')?.shadowed.map((entry) => entry.dir),
    ).toEqual(['/b/playwright']);
    expect(resolved.get('docs')?.winner.dir).toBe('/b/docs');
  });

  it('keeps deterministic winner and shadowed ordering across many collisions', () => {
    const entries: SkillDirEntry[] = [
      {
        name: 'playwright',
        dir: '/c/playwright',
        skillFile: '/c/playwright/SKILL.md',
        source: '/c',
        sourceIndex: 2,
      },
      {
        name: 'notes',
        dir: '/b/notes',
        skillFile: '/b/notes/SKILL.md',
        source: '/b',
        sourceIndex: 1,
      },
      {
        name: 'playwright',
        dir: '/a/playwright',
        skillFile: '/a/playwright/SKILL.md',
        source: '/a',
        sourceIndex: 0,
      },
      {
        name: 'docs',
        dir: '/c/docs',
        skillFile: '/c/docs/SKILL.md',
        source: '/c',
        sourceIndex: 2,
      },
      {
        name: 'playwright',
        dir: '/b/playwright',
        skillFile: '/b/playwright/SKILL.md',
        source: '/b',
        sourceIndex: 1,
      },
      {
        name: 'docs',
        dir: '/a/docs',
        skillFile: '/a/docs/SKILL.md',
        source: '/a',
        sourceIndex: 0,
      },
    ];

    const resolved = resolveSkills(entries);

    expect([...resolved.keys()]).toEqual(['docs', 'playwright', 'notes']);
    expect(resolved.get('docs')?.winner.dir).toBe('/a/docs');
    expect(resolved.get('playwright')?.winner.dir).toBe('/a/playwright');
    expect(
      resolved.get('playwright')?.shadowed.map((entry) => entry.dir),
    ).toEqual(['/b/playwright', '/c/playwright']);
  });
});
