import fs from 'node:fs/promises';
import path from 'node:path';
import { discoverSkillsWithMetrics } from './discover.js';
import { acquireOutputLock } from './lock.js';
import { reconcileOutput } from './reconcile.js';
import { resolveSkills } from './resolve.js';
import { SyncConfig, SyncResult, SyncWarning } from './types.js';

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function runSync(config: SyncConfig): Promise<SyncResult> {
  const lock = await acquireOutputLock(config.output);
  const warnings: SyncWarning[] = [];
  try {
    for (const source of config.sources) {
      if (!(await pathExists(source))) {
        warnings.push({
          code: 'source-missing',
          source: path.resolve(source),
        });
      }
    }
    const discovery = await discoverSkillsWithMetrics(config);
    const entries = discovery.entries;
    const resolved = resolveSkills(entries);
    const delayMs = Number(process.env.SKILLDIR_TEST_SYNC_DELAY_MS ?? 0);
    if (Number.isFinite(delayMs) && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    const reconcile = await reconcileOutput({
      output: config.output,
      resolved,
    });
    return {
      resolved,
      created: reconcile.created,
      updated: reconcile.updated,
      removed: reconcile.removed,
      warnings: [...warnings, ...reconcile.warnings],
      metrics: {
        discovery: discovery.metrics,
      },
    };
  } finally {
    await lock.release();
  }
}
