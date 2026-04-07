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
});
