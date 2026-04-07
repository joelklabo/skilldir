import { SyncResult } from './types.js';

function getShadowedCount(result: SyncResult): number {
  return [...result.resolved.values()].reduce(
    (count, entry) => count + entry.shadowed.length,
    0,
  );
}

export function renderStatus(result: SyncResult): string {
  const lines: string[] = [];
  lines.push(
    `summary: ${result.resolved.size} resolved, ${getShadowedCount(result)} shadowed, ${result.warnings.length} warnings, ${result.created.length} created, ${result.updated.length} updated, ${result.removed.length} removed`,
  );
  const names = [...result.resolved.keys()].sort((left, right) =>
    left.localeCompare(right, 'en'),
  );
  if (names.length > 0) lines.push('');
  for (const name of names) {
    const entry = result.resolved.get(name)!;
    lines.push(`${name} -> ${entry.winner.dir}`);
    if (entry.shadowed.length > 0) {
      lines.push('  shadowed:');
      for (const shadowed of [...entry.shadowed].sort((left, right) =>
        left.dir.localeCompare(right.dir, 'en'),
      )) {
        lines.push(`  - ${shadowed.dir}`);
      }
    }
  }
  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('warnings:');
    for (const warning of result.warnings) {
      if (warning.code === 'source-missing') {
        lines.push(`- missing source: ${warning.source}`);
      } else {
        lines.push(
          `- unmanaged conflict for ${warning.skill}: ${warning.path}`,
        );
      }
    }
  }
  return lines.join('\n');
}

export function renderStatusJson(result: SyncResult): string {
  return JSON.stringify(
    {
      schemaVersion: 1,
      summary: {
        resolved: result.resolved.size,
        shadowed: getShadowedCount(result),
        warnings: result.warnings.length,
        created: result.created.length,
        updated: result.updated.length,
        removed: result.removed.length,
      },
      resolved: [...result.resolved.entries()]
        .sort(([leftName], [rightName]) => leftName.localeCompare(rightName, 'en'))
        .map(([name, entry]) => ({
          name,
          winner: entry.winner.dir,
          shadowed: [...entry.shadowed]
            .sort((left, right) => left.dir.localeCompare(right.dir, 'en'))
            .map((candidate) => candidate.dir),
        })),
      warnings: result.warnings,
      created: result.created,
      updated: result.updated,
      removed: result.removed,
    },
    null,
    2,
  );
}
