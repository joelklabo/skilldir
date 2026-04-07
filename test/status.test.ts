import { describe, expect, it } from 'vitest';
import { renderStatus, renderStatusJson } from '../src/status.js';
import { resolveSkills } from '../src/resolve.js';
import { SyncResult } from '../src/types.js';

function makeResult(): SyncResult {
  return {
    resolved: resolveSkills([
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
    ]),
    created: [],
    updated: [],
    removed: [],
    warnings: [],
  };
}

describe('status output', () => {
  it('renders human output', () => {
    expect(renderStatus(makeResult())).toMatchInlineSnapshot(`
      "playwright -> /a/playwright
        shadowed:
        - /b/playwright"
    `);
  });

  it('renders JSON output', () => {
    const parsed = JSON.parse(renderStatusJson(makeResult())) as {
      resolved: Array<{ name: string; winner: string; shadowed: string[] }>;
      warnings: Array<unknown>;
      created: string[];
      updated: string[];
      removed: string[];
    };
    expect(parsed.resolved[0]).toEqual({
      name: 'playwright',
      winner: '/a/playwright',
      shadowed: ['/b/playwright'],
    });
    expect(parsed.created).toEqual([]);
  });

  it('renders warning blocks deterministically', () => {
    const text = renderStatus({
      ...makeResult(),
      warnings: [
        { code: 'source-missing', source: '/missing/source' },
        {
          code: 'conflicting-unmanaged-entry',
          skill: 'playwright',
          path: '/output/playwright',
          expectedTarget: '/a/playwright',
        },
      ],
    });

    expect(text).toMatchInlineSnapshot(`
      "playwright -> /a/playwright
        shadowed:
        - /b/playwright

      warnings:
      - missing source: /missing/source
      - unmanaged conflict for playwright: /output/playwright"
    `);
  });
});
