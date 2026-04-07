# skilldir

`skilldir` builds a normal directory of symlinks from an ordered list of skill sources.

The MVP rule is intentionally small:

- a skill is any directory containing `SKILL.md`
- the skill name is the directory basename
- sources are scanned in order
- first source wins
- the output directory is managed by `skilldir`
- config is versionless JSON in `0.x`
- `status --json` and `doctor --json` use schema version `1` in `0.x`
- symlinked source roots and symlinked skill directories are discovered normally

This is meant to make tools like Codex, OpenCode, and Claude Code consume one stable skill directory without changing the harness.

## Why

Different agent tools look for skills in different places. `skilldir` lets you define a single generated directory that represents the precedence union of several source trees.

## Commands

- `skilldir sync`
- `skilldir watch`
- `skilldir status`
- `skilldir doctor`

Both `status` and `doctor` support `--json`.

## Why Not Wrappers Or FUSE

- wrappers make correctness depend on every harness entrypoint
- FUSE is more complex to ship and debug than the current problem needs
- a managed symlink directory works with existing tools while keeping the model inspectable on disk

## Config

The MVP config format is JSON for simplicity.

```json
{
  "sources": [
    "/home/honk/code/project/.agents/skills",
    "/home/honk/.codex/skills",
    "/home/honk/.claude/skills"
  ],
  "output": "/home/honk/.agents/skills"
}
```

## Compatibility Examples

Project-local skills winning over global shared skills:

```json
{
  "sources": [
    "/home/honk/code/project/.agents/skills",
    "/home/honk/.codex/skills",
    "/home/honk/.claude/skills"
  ],
  "output": "/home/honk/.agents/skills"
}
```

Using `skilldir` to materialize a Claude-compatible skills directory:

```json
{
  "sources": [
    "/home/honk/code/project/.agents/skills",
    "/home/honk/.agents/skills"
  ],
  "output": "/home/honk/.claude/skills"
}
```

## Output Examples

Human-readable `status`:

```text
summary: 1 resolved, 1 shadowed, 0 warnings, 0 created, 0 updated, 0 removed

playwright -> /home/honk/code/project/.agents/skills/playwright
  shadowed:
  - /home/honk/.codex/skills/playwright
```

Machine-readable `status --json`:

```json
{
  "schemaVersion": 1,
  "summary": {
    "resolved": 1,
    "shadowed": 1,
    "warnings": 0,
    "created": 0,
    "updated": 0,
    "removed": 0
  },
  "resolved": [
    {
      "name": "playwright",
      "winner": "/home/honk/code/project/.agents/skills/playwright",
      "shadowed": ["/home/honk/.codex/skills/playwright"]
    }
  ],
  "warnings": [],
  "created": [],
  "updated": [],
  "removed": []
}
```

Human-readable `doctor`:

```text
doctor: 2 issue(s)
shadowed skill: playwright winner=/home/honk/code/project/.agents/skills/playwright shadowed=/home/honk/.codex/skills/playwright
unmanaged output entry: /home/honk/.agents/skills/manual
```

Machine-readable `doctor --json`:

```json
{
  "schemaVersion": 1,
  "issues": [
    {
      "code": "shadowed-skill",
      "skill": "playwright",
      "winner": "/home/honk/code/project/.agents/skills/playwright",
      "shadowed": "/home/honk/.codex/skills/playwright"
    }
  ],
  "count": 1
}
```

## Local Development

```bash
pnpm install
pnpm check
```

## Global CLI Usage

Run from the repo without publishing:

```bash
pnpm build
pnpm link --global
skilldir --help
```

Or install from a packed tarball:

```bash
pnpm build
pnpm pack
pnpm add --global ./skilldir-0.1.0.tgz
skilldir status --help
```

## CLI Help

```bash
skilldir --help
skilldir status --help
skilldir doctor --help
skilldir watch --help
```

## Troubleshooting

- If `sync` reports that the output is already locked, another `sync` or `watch` process is still holding the output lock file.
- If `doctor` reports unmanaged output entries, move or remove those entries from the managed output directory rather than expecting `skilldir` to adopt them automatically.
- If `doctor` reports a broken managed symlink, rerun `sync` after fixing the winning source tree or source order.

## Docs

- [TODO](./docs/TODO.md)
- [Architecture](./ARCHITECTURE.md)
- [Test Plan](./docs/TEST_PLAN.md)
