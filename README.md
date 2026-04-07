# skilldir

[![CI](https://github.com/joelklabo/skilldir/actions/workflows/ci.yml/badge.svg)](https://github.com/joelklabo/skilldir/actions/workflows/ci.yml)
[![Release](https://github.com/joelklabo/skilldir/actions/workflows/release.yml/badge.svg)](https://github.com/joelklabo/skilldir/actions/workflows/release.yml)
[![Pages](https://img.shields.io/badge/pages-live-166534)](https://joelklabo.github.io/skilldir/)

`skilldir` builds a normal directory of symlinks from an ordered list of skill sources.

The MVP rule is intentionally small:

- a skill is any directory containing `SKILL.md`
- the skill name is the directory basename
- sources are scanned in order
- first source wins
- the output directory is managed by `skilldir`
- JSON is the only supported config format in `0.x`
- `status --json` and `doctor --json` use schema version `1` in `0.x`
- symlinked source roots and symlinked skill directories are discovered normally
- hidden directories other than `.git` are scanned in `0.x`
- source labels are not part of the public config contract in `0.x`
- env var interpolation is not supported in `0.x`
- Windows support is best-effort only in `0.x`
- mirror directories are not a first-class feature in `0.x`; use one output per config

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

Using `skilldir` as the canonical `~/.agents/skills` directory:

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

Three-source compatibility precedence for the same skill key:

```text
sources[0] = /home/honk/code/project/.agents/skills
sources[1] = /home/honk/.codex/skills
sources[2] = /home/honk/.claude/skills

playwright resolves to the project-local skill
codex-only resolves to the Codex home skill
claude-only resolves to the Claude home skill
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

Doctor issue codes:

- `missing-source`
- `broken-managed-symlink`
- `unmanaged-output-entry`
- `shadowed-skill`

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

## Releases

Changesets manages versioning for this repo. npm publishing is intentionally deferred right now, so release automation is limited to versioning and release PR flow.

The current GitHub Actions blocker is repository policy: Actions can push the `changeset-release/main` branch, but the repo is not yet configured to let Actions open the version PR.

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
