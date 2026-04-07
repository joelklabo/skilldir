import fs from 'node:fs/promises';
import fsSync from 'node:fs';
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

async function canReadDirectory(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fsSync.constants.R_OK | fsSync.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function isManifestCorrupt(outputDir: string): Promise<boolean> {
  try {
    const raw = await fs.readFile(
      path.join(outputDir, '.skilldir-manifest.json'),
      'utf8',
    );
    const parsed: unknown = JSON.parse(raw);
    return !(
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { version?: unknown }).version === 1 &&
      typeof (parsed as { managed?: unknown }).managed === 'object' &&
      (parsed as { managed?: unknown }).managed !== null
    );
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError?.code === 'ENOENT') return false;
    return true;
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
      continue;
    }
    if (!(await canReadDirectory(source))) {
      issues.push({ code: 'source-permission-denied', path: source });
    }
  }
  if (
    (await exists(config.output)) &&
    !(await canReadDirectory(config.output))
  ) {
    issues.push({ code: 'output-permission-denied', path: config.output });
  }
  if (await isManifestCorrupt(config.output)) {
    issues.push({
      code: 'manifest-corrupt',
      path: path.join(config.output, '.skilldir-manifest.json'),
    });
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
  return issues.sort((left, right) => {
    const leftKey = JSON.stringify(left);
    const rightKey = JSON.stringify(right);
    return leftKey.localeCompare(rightKey, 'en');
  });
}

export function renderDoctor(issues: DoctorIssue[]): string {
  if (issues.length === 0) return 'doctor: ok';
  return [
    `doctor: ${issues.length} issue(s)`,
    ...issues.map((issue) => {
      switch (issue.code) {
        case 'missing-source':
          return `missing source: ${issue.source}`;
        case 'source-permission-denied':
          return `source permission denied: ${issue.path}`;
        case 'output-permission-denied':
          return `output permission denied: ${issue.path}`;
        case 'manifest-corrupt':
          return `manifest corrupt: ${issue.path}`;
        case 'broken-managed-symlink':
          return `broken managed symlink: ${issue.path} -> ${issue.target}`;
        case 'unmanaged-output-entry':
          return `unmanaged output entry: ${issue.path}`;
        case 'shadowed-skill':
          return `shadowed skill: ${issue.skill} winner=${issue.winner} shadowed=${issue.shadowed}`;
      }
    }),
  ].join('\n');
}

export function renderDoctorJson(issues: DoctorIssue[]): string {
  return JSON.stringify(
    {
      schemaVersion: 1,
      issues,
      count: issues.length,
    },
    null,
    2,
  );
}
