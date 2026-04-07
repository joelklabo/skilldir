import fs from 'node:fs/promises';
import path from 'node:path';
import { discoverSkillsWithMetrics } from './discover.js';
import { acquireOutputLock } from './lock.js';
import {
  loadRemoteCandidates,
  materializeRemoteWinner,
  pruneRemoteCache,
} from './remote.js';
import { reconcileOutput } from './reconcile.js';
import { resolveSkills } from './resolve.js';
import {
  DiscoverySourceMetric,
  RemoteSourceConfig,
  SyncConfig,
  SyncResult,
  SyncWarning,
} from './types.js';

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
    const localSources = config.sources.filter(
      (source): source is string => typeof source === 'string',
    );
    const remoteSources = config.sources.filter(
      (source): source is RemoteSourceConfig => typeof source !== 'string',
    );
    const localSourceIndices = new Map<string, number>(
      config.sources.flatMap((source, index) =>
        typeof source === 'string'
          ? [[path.resolve(source), index] as const]
          : [],
      ),
    );
    for (const source of config.sources) {
      if (typeof source !== 'string') continue;
      if (!(await pathExists(source))) {
        warnings.push({
          code: 'source-missing',
          source: path.resolve(source),
        });
      }
    }
    const localDiscovery = await discoverSkillsWithMetrics({
      sources: localSources,
      output: config.output,
    });
    const remoteEntries = [];
    const discoveryMetrics: DiscoverySourceMetric[] = [
      ...localDiscovery.metrics.perSource,
    ];
    for (const [sourceIndex, source] of config.sources.entries()) {
      if (typeof source === 'string') continue;
      const remote = await loadRemoteCandidates({
        source,
        sourceIndex,
      });
      remoteEntries.push(...remote.entries);
      warnings.push(...remote.warnings);
      discoveryMetrics.push({
        source: source.url,
        durationMs: remote.durationMs,
        discovered: remote.entries.length,
      });
    }
    const entries = [
      ...localDiscovery.entries.map((entry) => ({
        ...entry,
        sourceIndex: localSourceIndices.get(entry.source) ?? entry.sourceIndex,
      })),
      ...remoteEntries,
    ];
    const resolved = resolveSkills(entries);
    for (const resolution of resolved.values()) {
      if (!resolution.winner.remote) continue;
      const source = remoteSources.find(
        (remote) => remote.url === resolution.winner.remote?.sourceUrl,
      );
      if (!source) continue;
      await materializeRemoteWinner(source, resolution.winner);
    }
    const delayMs = Number(process.env.SKILLDIR_TEST_SYNC_DELAY_MS ?? 0);
    if (Number.isFinite(delayMs) && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    const reconcile = await reconcileOutput({
      output: config.output,
      resolved,
    });
    if (remoteSources.length > 0) {
      await pruneRemoteCache();
    }
    return {
      resolved,
      created: reconcile.created,
      updated: reconcile.updated,
      removed: reconcile.removed,
      warnings: [...warnings, ...reconcile.warnings],
      metrics: {
        discovery: {
          durationMs: discoveryMetrics.reduce(
            (total, metric) => total + metric.durationMs,
            0,
          ),
          perSource: discoveryMetrics,
        },
      },
    };
  } finally {
    await lock.release();
  }
}
