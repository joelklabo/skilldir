import { ResolvedSkill, SkillDirEntry } from './types.js';

export function resolveSkills(
  entries: SkillDirEntry[],
): Map<string, ResolvedSkill> {
  const resolved = new Map<string, ResolvedSkill>();
  for (const entry of entries) {
    const existing = resolved.get(entry.name);
    if (!existing) {
      resolved.set(entry.name, { winner: entry, shadowed: [] });
      continue;
    }
    existing.shadowed.push(entry);
  }
  return resolved;
}
