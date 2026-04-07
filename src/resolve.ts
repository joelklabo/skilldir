import { ResolvedSkill, SkillDirEntry } from './types.js';

function compareEntries(left: SkillDirEntry, right: SkillDirEntry): number {
  if (left.sourceIndex !== right.sourceIndex) {
    return left.sourceIndex - right.sourceIndex;
  }
  const leftSource = left.source.localeCompare(right.source, 'en');
  if (leftSource !== 0) return leftSource;
  const leftName = left.name.localeCompare(right.name, 'en');
  if (leftName !== 0) return leftName;
  return left.dir.localeCompare(right.dir, 'en');
}

export function resolveSkills(
  entries: SkillDirEntry[],
): Map<string, ResolvedSkill> {
  const resolved = new Map<string, ResolvedSkill>();
  for (const entry of [...entries].sort(compareEntries)) {
    const existing = resolved.get(entry.name);
    if (!existing) {
      resolved.set(entry.name, { winner: entry, shadowed: [] });
      continue;
    }
    existing.shadowed.push(entry);
  }
  return resolved;
}
