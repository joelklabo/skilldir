# skilldir

`skilldir` builds a normal directory of symlinks from an ordered list of skill sources.

The MVP rule is intentionally small:

- a skill is any directory containing `SKILL.md`
- the skill name is the directory basename
- sources are scanned in order
- first source wins
- the output directory is managed by `skilldir`

This is meant to make tools like Codex, OpenCode, and Claude Code consume one stable skill directory without changing the harness.

## Why

Different agent tools look for skills in different places. `skilldir` lets you define a single generated directory that represents the precedence union of several source trees.

## Status

This repo is being built in public with a TDD-first approach. The first milestone focuses on local filesystem sources only.

## Planned Commands

- `skilldir sync`
- `skilldir watch`
- `skilldir status`
- `skilldir doctor`

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

## Local Development

```bash
pnpm install
pnpm test
pnpm build
```

## Docs

- [TODO](./docs/TODO.md)
- [Architecture](./ARCHITECTURE.md)
- [Test Plan](./docs/TEST_PLAN.md)
