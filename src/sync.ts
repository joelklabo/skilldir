import fs from 'node:fs/promises';
import path from 'node:path';
import { discoverSkills } from './discover.js';
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
  const warnings: SyncWarning[] = [];
  for (const source of config.sources) {
    if (!(await pathExists(source))) {
      warnings.push({ code: 'source-missing', source: path.resolve(source) });
    }
  }
  const entries = await discoverSkills(config);
  const resolved = resolveSkills(entries);
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
  };
}
