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
      "summary: 1 resolved, 1 shadowed, 0 warnings, 0 created, 0 updated, 0 removed

      playwright -> /a/playwright
        shadowed:
        - /b/playwright"
    `);
  });

  it('renders JSON output', () => {
    const parsed = JSON.parse(renderStatusJson(makeResult())) as {
      schemaVersion: number;
      summary: {
        resolved: number;
        shadowed: number;
        warnings: number;
        created: number;
        updated: number;
        removed: number;
      };
      resolved: Array<{ name: string; winner: string; shadowed: string[] }>;
      warnings: Array<unknown>;
      created: string[];
      updated: string[];
      removed: string[];
    };
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.summary).toEqual({
      resolved: 1,
      shadowed: 1,
      warnings: 0,
      created: 0,
      updated: 0,
      removed: 0,
    });
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
      "summary: 1 resolved, 1 shadowed, 2 warnings, 0 created, 0 updated, 0 removed

      playwright -> /a/playwright
        shadowed:
        - /b/playwright

      warnings:
      - missing source: /missing/source
      - unmanaged conflict for playwright: /output/playwright"
    `);
  });
});
