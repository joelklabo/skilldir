import fs from 'node:fs/promises';
import path from 'node:path';
import { readManifest } from './manifest.js';
import { SyncResult, DoctorIssue, SyncConfig } from './types.js';

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.lstat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function runDoctor(
  config: SyncConfig,
  result: SyncResult,
): Promise<DoctorIssue[]> {
  const issues: DoctorIssue[] = [];
  for (const source of config.sources) {
    if (!(await exists(source))) {
      issues.push({ code: 'missing-source', source });
    }
  }
  for (const [skill, entry] of result.resolved) {
    for (const shadowed of entry.shadowed) {
      issues.push({
        code: 'shadowed-skill',
        skill,
        winner: entry.winner.dir,
        shadowed: shadowed.dir,
      });
    }
  }
  const outputEntries = await fs
    .readdir(config.output, { withFileTypes: true })
    .catch(() => []);
  const manifest = await readManifest(config.output);
  for (const item of outputEntries) {
    if (item.name.startsWith('.skilldir-')) continue;
    const itemPath = path.join(config.output, item.name);
    if (!Object.hasOwn(manifest.managed, item.name)) {
      issues.push({ code: 'unmanaged-output-entry', path: itemPath });
      continue;
    }
    const stats = await fs.lstat(itemPath);
    if (!stats.isSymbolicLink()) {
      issues.push({ code: 'unmanaged-output-entry', path: itemPath });
      continue;
    }
    const target = await fs.readlink(itemPath);
    const resolvedTarget = path.resolve(path.dirname(itemPath), target);
    if (!(await exists(resolvedTarget))) {
      issues.push({
        code: 'broken-managed-symlink',
        skill: item.name,
        path: itemPath,
        target: resolvedTarget,
      });
    }
  }
  return issues;
}

export function renderDoctor(issues: DoctorIssue[]): string {
  if (issues.length === 0) return 'doctor: ok';
  return issues
    .map((issue) => {
      switch (issue.code) {
        case 'missing-source':
          return `missing source: ${issue.source}`;
        case 'broken-managed-symlink':
          return `broken managed symlink: ${issue.path} -> ${issue.target}`;
        case 'unmanaged-output-entry':
          return `unmanaged output entry: ${issue.path}`;
        case 'shadowed-skill':
          return `shadowed skill: ${issue.skill} winner=${issue.winner} shadowed=${issue.shadowed}`;
      }
    })
    .join('\n');
}
