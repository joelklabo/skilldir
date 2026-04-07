import fs from 'node:fs/promises';
import path from 'node:path';
import { readManifest, writeManifest } from './manifest.js';
import { ResolvedSkill, SyncResult, SyncWarning } from './types.js';

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.lstat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readSymlinkTarget(filePath: string): Promise<string | null> {
  try {
    return await fs.readlink(filePath);
  } catch {
    return null;
  }
}

async function replaceSymlink(
  linkPath: string,
  targetPath: string,
): Promise<void> {
  const tempPath = `${linkPath}.tmp-${process.pid}-${Date.now()}`;
  await fs.symlink(targetPath, tempPath);
  await fs.rename(tempPath, linkPath);
}

export async function reconcileOutput(input: {
  output: string;
  resolved: Map<string, ResolvedSkill>;
}): Promise<Pick<SyncResult, 'created' | 'updated' | 'removed' | 'warnings'>> {
  const output = path.resolve(input.output);
  await fs.mkdir(output, { recursive: true });
  const manifest = await readManifest(output);
  const created: string[] = [];
  const updated: string[] = [];
  const removed: string[] = [];
  const warnings: SyncWarning[] = [];
  const nextManaged: Record<string, string> = {};

  for (const [skill, resolution] of input.resolved) {
    const linkPath = path.join(output, skill);
    const desiredTarget = resolution.winner.dir;
    nextManaged[skill] = desiredTarget;
    const stats = await fs.lstat(linkPath).catch(() => null);
    if (!stats) {
      await fs.symlink(desiredTarget, linkPath);
      created.push(skill);
      continue;
    }
    if (!stats.isSymbolicLink()) {
      warnings.push({
        code: 'conflicting-unmanaged-entry',
        skill,
        path: linkPath,
        expectedTarget: desiredTarget,
      });
      continue;
    }
    const target = await readSymlinkTarget(linkPath);
    const resolvedTarget = target
      ? path.resolve(path.dirname(linkPath), target)
      : null;
    const isManaged = Object.hasOwn(manifest.managed, skill);
    if (resolvedTarget === desiredTarget) continue;
    if (!isManaged) {
      warnings.push({
        code: 'conflicting-unmanaged-entry',
        skill,
        path: linkPath,
        expectedTarget: desiredTarget,
      });
      continue;
    }
    await replaceSymlink(linkPath, desiredTarget);
    updated.push(skill);
  }

  for (const [skill] of Object.entries(manifest.managed)) {
    if (Object.hasOwn(nextManaged, skill)) continue;
    const linkPath = path.join(output, skill);
    if (await pathExists(linkPath)) {
      const stats = await fs.lstat(linkPath);
      if (stats.isSymbolicLink()) {
        await fs.unlink(linkPath);
        removed.push(skill);
      }
    }
  }

  await writeManifest(output, { version: 1, managed: nextManaged });
  return { created, updated, removed, warnings };
}
