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

## Commands

- `skilldir sync`
- `skilldir watch`
- `skilldir status`
- `skilldir doctor`

Both `status` and `doctor` support `--json`.

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
playwright -> /home/honk/code/project/.agents/skills/playwright
  shadowed:
  - /home/honk/.codex/skills/playwright
```

Machine-readable `status --json`:

```json
{
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
shadowed skill: playwright winner=/home/honk/code/project/.agents/skills/playwright shadowed=/home/honk/.codex/skills/playwright
unmanaged output entry: /home/honk/.agents/skills/manual
```

Machine-readable `doctor --json`:

```json
{
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

## Troubleshooting

- If `sync` reports that the output is already locked, another `sync` or `watch` process is still holding the output lock file.
- If `doctor` reports unmanaged output entries, move or remove those entries from the managed output directory rather than expecting `skilldir` to adopt them automatically.

## Docs

- [TODO](./docs/TODO.md)
- [Architecture](./ARCHITECTURE.md)
- [Test Plan](./docs/TEST_PLAN.md)
