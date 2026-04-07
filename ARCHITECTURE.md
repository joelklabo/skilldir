# Architecture

`skilldir` has one core job: produce a first-source-wins union of skill directories as a normal folder of symlinks.

## Core model

- `sources[]`: ordered input directories
- `output`: managed symlink directory
- skill identity: folder basename containing `SKILL.md`
- precedence: first source in the array wins

## Core flow

1. Discover candidate skill directories in each source.
2. Resolve conflicts with first-source-wins.
3. Reconcile the output directory to match the resolved set.
4. Report the winner/shadowed state through `status` and health problems through `doctor`.

## Non-goals in the MVP

- remote registries
- FUSE or virtual filesystems
- frontmatter-derived naming
- wrapper-based harness integrations
- automatic adoption or movement of unmanaged output entries
