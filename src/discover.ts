import fs from 'node:fs/promises';
import path from 'node:path';
import { SkillDirEntry } from './types.js';

const DEFAULT_IGNORED_NAMES = new Set(['.git', 'node_modules']);

async function statOrNull(filePath: string) {
  try {
    return await fs.lstat(filePath);
  } catch {
    return null;
  }
}

async function walkDirectory(
  root: string,
  source: string,
  sourceIndex: number,
  outputPath: string,
  entries: SkillDirEntry[],
): Promise<void> {
  const stats = await statOrNull(root);
  if (!stats?.isDirectory()) return;
  if (path.resolve(root) === outputPath) return;

  const skillFile = path.join(root, 'SKILL.md');
  const skillStats = await statOrNull(skillFile);
  if (skillStats?.isFile()) {
    entries.push({
      name: path.basename(root),
      dir: root,
      skillFile,
      source,
      sourceIndex,
    });
    return;
  }

  const children = await fs.readdir(root, { withFileTypes: true });
  await Promise.all(
    children.map(async (child) => {
      if (!child.isDirectory()) return;
      if (DEFAULT_IGNORED_NAMES.has(child.name)) return;
      await walkDirectory(
        path.join(root, child.name),
        source,
        sourceIndex,
        outputPath,
        entries,
      );
    }),
  );
}

export async function discoverSkills(input: {
  sources: string[];
  output: string;
}): Promise<SkillDirEntry[]> {
  const entries: SkillDirEntry[] = [];
  const outputPath = path.resolve(input.output);
  for (const [sourceIndex, source] of input.sources.entries()) {
    await walkDirectory(
      path.resolve(source),
      path.resolve(source),
      sourceIndex,
      outputPath,
      entries,
    );
  }
  return entries.sort((left, right) => {
    if (left.sourceIndex !== right.sourceIndex)
      return left.sourceIndex - right.sourceIndex;
    return left.dir.localeCompare(right.dir, 'en');
  });
}
