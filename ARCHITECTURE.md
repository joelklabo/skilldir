# Architecture

`skilldir` has one core job: produce a first-source-wins union of skill directories as a normal folder of symlinks.

## Core model

- `sources[]`: ordered input directories
- `output`: managed symlink directory
- skill identity: folder basename containing `SKILL.md`
- precedence: first source in the array wins
- config: versionless JSON for the `0.x` line
- machine-readable output: `status --json` and `doctor --json` with schema version `1`
- discovery follows symlinked source roots and symlinked skill directories

## Core flow

1. Discover candidate skill directories in each source.
2. Resolve conflicts with first-source-wins.
3. Reconcile the output directory to match the resolved set.
4. Report the winner/shadowed state through `status` and health problems through `doctor`.

## Invariants

- `output` should match the first-source-wins union of `sources`
- managed entries in `output` are symlinks created by `skilldir`
- unmanaged entries in `output` are reported, not adopted or moved automatically
- source ordering is the only precedence rule in the MVP

## Why The Manifest Exists

- it lets `skilldir` distinguish managed symlinks from user-created entries
- it prevents `sync` from rewriting unrelated symlinks that happen to share a name
- it gives `doctor` a stable way to identify broken managed symlinks

## Why Source Order Beats Priorities In The MVP

- the rule is visible directly in config
- it is easy to explain in docs and status output
- it avoids a second precedence system that can drift from real intent

## Deferred By Design

- remote registries and fetched cache roots
- frontmatter-derived naming
- wrapper-based harness integration
- virtual filesystems or FUSE
- automatic movement or adoption of unmanaged output entries

## Non-goals in the MVP

- remote registries
- FUSE or virtual filesystems
- frontmatter-derived naming
- wrapper-based harness integrations
- automatic adoption or movement of unmanaged output entries
