import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { DiscoveryMetrics, SkillDirEntry } from './types.js';

const DEFAULT_IGNORED_NAMES = new Set(['.git', 'node_modules']);

async function statOrNull(filePath: string) {
  try {
    return await fs.lstat(filePath);
  } catch {
    return null;
  }
}

async function getDirectoryInfo(
  root: string,
): Promise<{ realPath: string } | null> {
  const stats = await statOrNull(root);
  if (!stats) return null;
  if (stats.isDirectory()) {
    return {
      realPath: await fs.realpath(root).catch(() => path.resolve(root)),
    };
  }
  if (!stats.isSymbolicLink()) return null;
  const targetStats = await fs.stat(root).catch(() => null);
  if (!targetStats?.isDirectory()) return null;
  return { realPath: await fs.realpath(root).catch(() => path.resolve(root)) };
}

async function walkDirectory(
  root: string,
  source: string,
  sourceIndex: number,
  outputPath: string,
  seen: Set<string>,
  entries: SkillDirEntry[],
): Promise<void> {
  const directory = await getDirectoryInfo(root);
  if (!directory) return;
  if (directory.realPath === outputPath) return;
  if (seen.has(directory.realPath)) return;
  seen.add(directory.realPath);

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

  const children = await fs
    .readdir(root, { withFileTypes: true })
    .catch(() => null);
  if (!children) return;
  await Promise.all(
    children.map(async (child) => {
      if (DEFAULT_IGNORED_NAMES.has(child.name)) return;
      await walkDirectory(
        path.join(root, child.name),
        source,
        sourceIndex,
        outputPath,
        seen,
        entries,
      );
    }),
  );
}

export async function discoverSkills(input: {
  sources: string[];
  output: string;
}): Promise<SkillDirEntry[]> {
  return (await discoverSkillsWithMetrics(input)).entries;
}

export async function discoverSkillsWithMetrics(input: {
  sources: string[];
  output: string;
}): Promise<{ entries: SkillDirEntry[]; metrics: DiscoveryMetrics }> {
  const entries: SkillDirEntry[] = [];
  const perSource: DiscoveryMetrics['perSource'] = [];
  const startedAt = performance.now();
  const outputPath = await fs
    .realpath(input.output)
    .catch(() => path.resolve(input.output));
  for (const [sourceIndex, source] of input.sources.entries()) {
    const resolvedSource = path.resolve(source);
    const sourceStartedAt = performance.now();
    const entryCountBefore = entries.length;
    await walkDirectory(
      resolvedSource,
      resolvedSource,
      sourceIndex,
      outputPath,
      new Set<string>(),
      entries,
    );
    perSource.push({
      source: resolvedSource,
      durationMs: performance.now() - sourceStartedAt,
      discovered: entries.length - entryCountBefore,
    });
  }
  return {
    entries: entries.sort((left, right) => {
      if (left.sourceIndex !== right.sourceIndex)
        return left.sourceIndex - right.sourceIndex;
      return left.dir.localeCompare(right.dir, 'en');
    }),
    metrics: {
      durationMs: performance.now() - startedAt,
      perSource,
    },
  };
}
