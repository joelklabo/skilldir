import { SyncResult } from './types.js';

export function renderStatus(result: SyncResult): string {
  const lines: string[] = [];
  const names = [...result.resolved.keys()].sort((left, right) =>
    left.localeCompare(right, 'en'),
  );
  for (const name of names) {
    const entry = result.resolved.get(name)!;
    lines.push(`${name} -> ${entry.winner.dir}`);
    if (entry.shadowed.length > 0) {
      lines.push('  shadowed:');
      for (const shadowed of entry.shadowed) {
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
      resolved: [...result.resolved.entries()].map(([name, entry]) => ({
        name,
        winner: entry.winner.dir,
        shadowed: entry.shadowed.map((candidate) => candidate.dir),
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
