# skilldir Todo

This document is intentionally detailed. It is meant to be used as the working backlog, not as a marketing roadmap.

Current repo state at a high level:

- `skilldir` exists as a TypeScript CLI with `sync`, `status`, `doctor`, and `watch`
- resolution is first-source-wins
- skill identity is the directory basename containing `SKILL.md`
- output is a managed symlink directory with a manifest of managed entries
- tests, CI, release scaffolding, and a landing page already exist

The remaining work is organized in execution order.

## Phase 0. Confirm Current Baseline

- [x] Create the repository
- [x] Publish the initial repo to GitHub
- [x] Add CI workflow
- [x] Add release/versioning scaffold with Changesets
- [x] Add a Pages landing page scaffold
- [x] Add the first public README
- [x] Add issue templates, PR template, contributing guide, and code of conduct
- [x] Implement `sync`
- [x] Implement `status`
- [x] Implement `doctor`
- [x] Implement `watch`
- [x] Add unit and integration coverage for current MVP behavior
- [x] Verify local `pnpm check` passes
- [x] Confirm GitHub Pages is enabled and the deployed site matches `site/index.html`
- [x] Confirm the release workflow has the required repository permissions and tokens

## Phase 1. Define the `0.x` Product Contract

- [x] Decide whether JSON remains the only config format for the full `0.x` line
- [x] Decide whether `skilldir` will treat source labels as cosmetic metadata or part of the public config contract
- [x] Decide whether the canonical example output path in docs should be `~/.agents/skills`
- [x] Decide whether `status --json` and `doctor --json` are now stable API surfaces
- [x] Decide whether the manifest file is part of the supported public implementation contract or intentionally private
- [x] Decide how much Windows support is explicitly promised in `0.x`
- [x] Decide whether duplicate skill names within a single source are warnings or hard errors
- [x] Decide whether hidden directories other than `.git` are scanned by default or ignored by default
- [x] Write these decisions down in the README and architecture docs

## Phase 2. Core CLI Hardening

### Config loading

- [x] Add a config version field or explicitly document versionless config
- [x] Support `--config` consistently on every command
- [x] Add better config-file-not-found errors
- [x] Add better config-parse errors with filename and line/column when possible
- [x] Expand `~` in configured paths
- [x] Normalize all configured paths to absolute paths
- [x] Resolve relative paths from the config file directory, not the shell cwd
- [x] Add explicit tests for path normalization
- [x] Decide whether env var interpolation is supported
- [x] If env var interpolation is supported, define exact syntax and escaping behavior
- [x] Add config fixtures covering valid and invalid cases

### Discovery

- [x] Add explicit tests for symlinked source roots
- [x] Add explicit tests for symlinked skill directories inside a source
- [x] Add explicit tests for unreadable directories
- [x] Add explicit tests for nested output directories beneath a source
- [x] Add explicit tests for very deep directory trees
- [x] Add explicit tests for skills with spaces and punctuation in folder names
- [x] Add explicit tests for case-sensitive and case-insensitive collisions where possible
- [x] Decide whether recursive scanning should be depth-limited
- [x] Decide whether directories beginning with `.` should be skipped by default
- [ ] Add source-scan timing instrumentation if large trees become a problem

### Resolution

- [x] Preserve deterministic ordering for winners
- [x] Preserve deterministic ordering for shadowed candidates
- [x] Add tests for three or more colliding sources for one skill
- [x] Add tests for multiple unique skills across many sources
- [x] Add a human-readable explanation of the precedence rule to `status`
- [x] Decide whether `status` should optionally show source index numbers
- [x] Decide whether `status` should optionally show source labels

### Reconciliation

- [x] Add an explicit lock for concurrent `sync` runs
- [x] Decide whether the lock lives in the output directory or app-state directory
- [x] Add tests for two concurrent sync processes
- [x] Add tests for stale manifest entries
- [x] Add tests for broken managed symlinks before sync
- [x] Add tests for unmanaged files blocking desired skill names
- [x] Add tests for unmanaged directories blocking desired skill names
- [x] Add tests for unmanaged symlinks blocking desired skill names
- [x] Add tests for managed symlink retargeting after precedence changes
- [x] Decide whether temp symlink creation needs stronger atomic semantics on non-Unix platforms
- [x] Decide whether manifest writes should be atomic temp-write + rename
- [x] Add cleanup behavior for temp files left behind after interrupted syncs

## Phase 3. Diagnostics and UX

### Status output

- [x] Add a compact summary line with counts
- [x] Add `status --json`
- [x] Define a stable JSON schema for `status --json`
- [x] Add snapshot tests for human-readable status output
- [x] Add snapshot tests for JSON status output
- [x] Decide whether empty sources are shown in `status`
- [x] Decide whether shadowed candidates should be hidden behind a flag in compact mode
- [x] Decide whether ANSI color is worth adding in `0.x`

### Doctor output

- [x] Add `doctor --json`
- [x] Define a stable JSON schema for `doctor --json`
- [x] Add snapshot tests for human-readable doctor output
- [x] Add snapshot tests for JSON doctor output
- [x] Add explicit checks for output directory permission failures
- [x] Add explicit checks for source directory permission failures
- [x] Add explicit checks for manifest corruption
- [x] Decide which doctor issues should produce non-zero exit codes
- [x] Add an explicit machine-readable code list to the docs

### CLI ergonomics

- [x] Add top-level `--help` examples
- [x] Add per-command examples
- [x] Add a top-level `--version`
- [x] Add `--quiet`
- [x] Add `--verbose`
- [x] Decide whether `sync` should print full status or just a compact summary by default
- [x] Decide whether `doctor` should be quiet on success or print `doctor: ok`

## Phase 4. Watch Mode Hardening

- [x] Add tests for startup sync followed by change-driven sync
- [x] Add tests for repeated burst changes across multiple paths
- [x] Add tests for source directory deletion and recreation
- [x] Add tests for output directory deletion while watch mode is running
- [x] Add tests for signal handling and clean shutdown
- [x] Add tests for interval-driven periodic resync
- [x] Add overflow/backstop behavior if the watcher misses events
- [x] Add log messages that distinguish filesystem-triggered syncs from periodic syncs
- [x] Decide whether watch mode should continue when a source disappears temporarily
- [x] Decide whether watch mode should emit structured logs in a future `--json` mode

## Phase 5. CLI Integration and End-to-End Tests

- [x] Add CLI smoke tests that invoke the built binary
- [x] Add CLI tests for `sync --config`
- [x] Add CLI tests for `status`
- [x] Add CLI tests for `status --json`
- [x] Add CLI tests for `doctor`
- [x] Add CLI tests for error cases like missing config and invalid config
- [x] Add integration tests for nested source/output combinations
- [x] Add integration tests for broken symlinks in the output tree
- [x] Add integration tests for unmanaged output conflicts
- [x] Add integration tests for precedence changes between sync runs
- [x] Add fixture directories that model realistic Codex/OpenCode/Claude skill trees
- [x] Decide whether to add large-tree performance tests in CI or keep them local-only

## Phase 6. Documentation Quality

### README

- [x] Add installation instructions for local development
- [x] Add installation instructions for global CLI usage
- [x] Add a short “why not wrappers / why not FUSE” rationale
- [x] Add explicit compatibility notes for Codex, OpenCode, and Claude Code
- [x] Add sample `status` and `doctor` output
- [x] Add troubleshooting section for unmanaged output entries
- [x] Add troubleshooting section for permissions and broken symlinks
- [x] Add badges for CI and release status

### Architecture docs

- [x] Add a one-page architecture diagram to the site or docs
- [x] Add a short “invariants” section
- [x] Add a “why the manifest exists” section
- [x] Add a “why source order beats priorities in the MVP” section
- [x] Add a “what is intentionally deferred” section

### Contributor docs

- [x] Document local release flow with Changesets
- [x] Document how to add a new test fixture
- [x] Document how to validate Pages locally
- [x] Document branch/commit hygiene expectations

## Phase 7. CI, Release, and Operations

### CI

- [x] Confirm the CI workflow runs on PRs and on `main`
- [x] Confirm CI uses `pnpm install --frozen-lockfile`
- [x] Decide whether CI should also run `format:check`
- [x] Decide whether coverage should be uploaded somewhere
- [x] Add artifact upload for built output if that becomes useful
- [x] Add a badge to the README once the workflow name is stable

### Release workflow

- [ ] Confirm the Changesets workflow opens version PRs correctly
  - Current state: the workflow pushes `changeset-release/main`, but GitHub Actions is not currently permitted by repo settings to create the version PR.
- [x] Decide whether release PRs should be auto-merged or manually reviewed
- [x] Decide whether npm publishing is part of the next milestone or deferred
- [ ] If npm publishing is enabled, add `NPM_TOKEN` and document required setup
- [x] If npm publishing is deferred, make that explicit in docs and workflow comments
- [x] Add a release checklist for the first public package release
- [ ] Confirm release notes render correctly in GitHub Releases

### Pages

- [x] Confirm Pages is enabled in repo settings
- [x] Confirm the Pages workflow deploys on `main`
- [x] Confirm the custom site path matches the repo name
- [x] Add a simple diagram or animation only if it improves understanding
- [x] Keep the site static until product messaging stabilizes

### Governance and maintenance

- [x] Add branch protection recommendations to docs
- [x] Decide whether `main` requires green CI before merge
- [x] Decide whether release PRs require one reviewer or can be self-merged
- [ ] Add issue labels if support volume grows
- [x] Add a lightweight support triage guide

## Phase 8. Compatibility Follow-Through

- [x] Add docs examples for using `skilldir` output as `~/.agents/skills`
- [x] Add docs examples for using `skilldir` output as `~/.claude/skills`
- [x] Add docs examples for source ordering that prefer project-local skills over global skills
- [x] Add fixture trees that mirror common Codex/OpenCode/Claude layouts
- [x] Add tests that show the same skill key from three different harness-specific sources
- [x] Decide whether to support mirror directories as a first-class feature or keep one output only
- [x] Decide whether future per-source labels should be used in compatibility docs

## Phase 9. Remote Source Support, Materialized Cache, and Future Architecture

This phase intentionally treats remote support as “another source” rather than a replacement for the local model.

### 9.1. Product contract

- [ ] Decide whether remote support lands in `0.x` or waits for `1.0`
- [ ] Decide whether remote support is read-only in the first version
- [ ] Decide whether remote support is opt-in per source entry
- [ ] Decide whether remote-fetched skills are addressed by skill key only or by key + version
- [ ] Decide whether remote sources are allowed to override local sources purely by order in `sources[]`
- [ ] Decide whether remote materialized cache paths are treated as internal implementation details

### 9.2. Config shape for remote sources

- [ ] Define the config schema for a remote source entry
- [ ] Decide whether local and remote sources share one union type or separate arrays
- [ ] Add fields for remote base URL
- [ ] Add fields for auth mode
- [ ] Add fields for refresh interval or cache TTL
- [ ] Add fields for trust/integrity policy
- [ ] Add fields for per-source label and description
- [ ] Add docs examples for a mixed local + remote config
- [ ] Add config validation tests for malformed remote entries

### 9.3. Local materialized cache design

- [ ] Pick a cache root, for example under `~/.local/share/skilldir/`
- [ ] Decide the object directory layout for fetched skill bundles
- [ ] Decide whether cache objects are keyed by skill name, version, digest, or a combination
- [ ] Decide where the remote-source manifest or index lives
- [ ] Decide how cache garbage collection works
- [ ] Decide whether cache entries are shared across multiple configs on one machine
- [ ] Add tests for cache reuse between sync runs
- [ ] Add tests for stale cache cleanup

### 9.4. Resolve and fetch flow

- [ ] Define the local state machine for remote sync:
- [ ] fetch source index or source-specific metadata
- [ ] decide candidate skill names available from the remote source
- [ ] resolve the winning remote skill entry for a requested key
- [ ] fetch the content only when needed or prefetch it explicitly
- [ ] materialize the fetched content into the cache
- [ ] expose the cache directory as a normal local source candidate
- [ ] Decide whether remote sources prefetch the full index or fetch per skill lazily
- [ ] Decide whether `status` should show both cache path and remote origin
- [ ] Decide whether `doctor` should report stale remote metadata separately from local source issues

### 9.5. Archive and extraction strategy

- [ ] Decide whether remote payloads are tarballs, zip files, or raw file lists
- [ ] Decide whether the remote source returns a digest before download
- [ ] Decide whether the local client verifies the digest after download
- [ ] Decide whether extraction happens into a temp directory before rename
- [ ] Add tests for corrupt archives
- [ ] Add tests for partial downloads
- [ ] Add tests for interrupted extraction
- [ ] Add tests for path traversal attacks in archives

### 9.6. Trust and integrity

- [ ] Decide whether digest verification is mandatory
- [ ] Decide whether signatures are in scope for the first remote version
- [ ] Decide whether remote sources can be marked “trusted” or “unsafe”
- [ ] Decide how auth tokens are stored or read
- [ ] Decide whether credentials are taken from env vars, config, keychain, or external helpers
- [ ] Add explicit docs on what is and is not trusted
- [ ] Add redaction rules for logs and error output
- [ ] Add tests for missing credentials
- [ ] Add tests for invalid credentials
- [ ] Add tests for digest mismatch

### 9.7. Failure modes and fallback behavior

- [ ] Decide what happens if the remote source is unavailable during `sync`
- [ ] Decide what happens if the remote index can be read but a specific skill fetch fails
- [ ] Decide whether stale cached content may continue to satisfy the source
- [ ] Decide whether remote failures are warnings or hard sync failures
- [ ] Add tests for network timeout
- [ ] Add tests for 404 skill-not-found
- [ ] Add tests for 401/403 auth failures
- [ ] Add tests for malformed server responses
- [ ] Add tests for stale cache fallback behavior

### 9.8. Compatibility model

- [ ] Ensure remote-fetched skills still end up as ordinary local directories before reconciliation
- [ ] Ensure the output directory remains just symlinks to local materialized directories
- [ ] Ensure no harness-specific runtime plugin is required
- [ ] Add docs that explain remote support does not change the harness contract
- [ ] Add integration tests mixing local and remote candidates for the same skill key
- [ ] Add integration tests showing remote source order relative to local sources

### 9.9. Operational tooling

- [ ] Add `doctor` checks for remote cache health
- [ ] Add `doctor` checks for remote auth state if feasible
- [ ] Decide whether a dedicated `cache prune` command is needed
- [ ] Decide whether a dedicated `cache warm` command is needed
- [ ] Decide whether remote source refresh belongs in `watch` or a separate command
- [ ] Add logs/metrics for remote fetch counts, failures, and cache hits

### 9.10. Phased rollout plan

- [ ] Phase R1: remote materialized cache treated as a manually populated local source
- [ ] Phase R2: `skilldir` manages remote index refresh but not lazy fetch
- [ ] Phase R3: `skilldir` manages fetch + verification + extraction into cache
- [ ] Phase R4: `watch` mode refreshes remote sources on interval
- [ ] Phase R5: add stronger trust/integrity guarantees if real usage justifies them
- [ ] Keep each phase behind clear docs and tests before moving to the next one

## Phase 10. Explicitly Deferred

- [ ] Per-agent policy engines
- [ ] Wrapper-based harness startup behavior
- [ ] Automatic movement/adoption of unmanaged output entries
- [ ] FUSE or virtual filesystems
- [ ] Rich frontmatter-derived skill identity
- [ ] Multi-writer sync semantics across machines

## Suggested Next Execution Slice

If work starts immediately, the highest-value slice is:

- [x] Add `status --json` and `doctor --json`
- [x] Add CLI integration tests that execute the built binary
- [x] Add snapshot tests for text output
- [x] Add lock protection for concurrent syncs
- [x] Confirm Pages deployment and release workflow permissions
- [x] Add README compatibility examples for Codex/OpenCode/Claude Code

That slice tightens the current product before expanding scope.
