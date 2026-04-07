# Test Plan

## Goals

- Keep the core logic pure and deterministic.
- Use temp-directory integration tests for filesystem behavior.
- Make status and doctor output stable enough to support regression tests.

## Unit Coverage

### Discovery

- detects a directory with `SKILL.md`
- ignores directories without `SKILL.md`
- ignores `node_modules`
- ignores `.git`
- ignores nested output directory when configured
- follows symlinked source roots
- follows symlinked skill directories
- scans hidden directories other than `.git`
- supports deep recursive trees
- preserves distinct case-sensitive names where the filesystem allows them

### Resolution

- first source wins
- later duplicates become shadowed
- unique skills survive normally
- winner/shadowed ordering stays deterministic

### Reconciliation

- creates output symlink
- updates wrong managed symlink
- removes stale managed symlink
- preserves unmanaged directory
- preserves unmanaged symlink
- preserves unmanaged file
- cleans stale temp symlink artifacts
- writes manifest

### Status

- human output lists winners
- human output lists shadowed candidates
- JSON output is structured and stable

### Doctor

- reports missing source paths
- reports unmanaged output entries
- reports broken managed symlinks

### Watch

- debounces repeated changes
- calls sync on periodic fallback
- reacts to source deletion and recreation events

## Integration Coverage

- full sync over temp source trees
- status output after sync
- doctor output after introducing conflicts
- watch mode with file creation and deletion
- nested source/output combinations
- project/Codex/Claude precedence fixtures
