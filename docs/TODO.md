# skilldir Todo

This backlog is intentionally super granular. It is organized to be executable in sequence, to support TDD, and to make hidden work visible before it turns into scope drift.

Status labels:

- `[x]` already done
- `[ ]` not started
- `decision:` explicit decision needed before coding
- `verify:` explicit validation step after implementation

## 0. Snapshot

- [x] Repository exists and is published.
- [x] Core MVP commands exist: `sync`, `status`, `doctor`, `watch`.
- [x] First-source-wins resolution exists.
- [x] Symlink materialization exists.
- [x] Managed manifest exists.
- [x] Initial CI, release, and Pages scaffolding exists.
- [x] Initial unit and integration coverage exists.

## 1. Product decisions to lock before more code

- [ ] Confirm the public promise for `0.x`.
- [ ] Decide whether the public contract is “JSON config only” or “JSON now, YAML next”.
- [ ] Decide whether `~/.agents/skills` is recommended in docs or if `output` stays fully user-defined.
- [ ] Decide whether source labels are a `0.x` feature or deferred.
- [ ] Decide whether duplicate skill names inside one source are warnings or hard errors.
- [ ] Decide whether hidden directories other than `.git` should be ignored by default.
- [ ] Decide whether unmanaged blocking entries in `output` should make `sync` return a non-zero exit code.
- [ ] Decide whether `doctor` becomes the only command that exits non-zero for health issues or whether `sync` should also fail on certain classes of problems.
- [ ] Decide whether manifest location stays in `output` or eventually moves to app state.
- [ ] Decide whether Windows symlink support is in-scope for `0.x`.
- [ ] Decide whether npm publishing is part of the first public release or explicitly deferred.

## 2. Backlog sequencing

### Phase A: CLI/core hardening

- [ ] Harden config parsing and path normalization.
- [ ] Harden status/doctor output contracts.
- [ ] Harden reconcile safety around unmanaged entries and concurrent syncs.
- [ ] Add CLI integration tests.

### Phase B: operational readiness

- [ ] Finish release/versioning path.
- [ ] Finish docs, landing page, and install instructions.
- [ ] Tighten CI for PR confidence.

### Phase C: forward architecture

- [ ] Design labeled sources.
- [ ] Design alternate config formats.
- [ ] Design remote-materialized source support.
- [ ] Design service-install examples for background watch.

## 3. Config and input hardening

- [x] Define MVP config shape with `sources` and `output`.
- [x] Resolve config-relative paths.
- [ ] Add explicit config schema documentation in README.
- [ ] Add `docs/config.md` or equivalent config section with examples.
- [ ] Add config fixture for minimal valid config.
- [ ] Add config fixture for config with relative paths.
- [ ] Add config fixture for config with duplicate source paths.
- [ ] Add config fixture for config with missing `sources`.
- [ ] Add config fixture for config with empty `sources`.
- [ ] Add config fixture for config with missing `output`.
- [ ] Add config fixture for config with non-string `sources` entries.
- [ ] Add unit test for invalid JSON parse failures.
- [ ] Add unit test for missing config file path.
- [ ] Add unit test for config-relative path resolution.
- [ ] Add unit test for duplicate sources and define desired behavior.
- [ ] Add unit test for `~` expansion if/when supported.
- [ ] Add explicit CLI error text for config parse failures.
- [ ] Add explicit CLI error text for missing config file.
- [ ] Add exit code contract for config failures.
- [ ] `decision:` keep JSON only in `0.1.x` or add YAML/TOML.
- [ ] If YAML is added later:
- [ ] Add parser dependency selection criteria.
- [ ] Add format precedence rules.
- [ ] Add tests for format parity.

## 4. Discovery hardening

- [x] Recursively walk sources.
- [x] Detect skills by `SKILL.md`.
- [x] Ignore `.git`.
- [x] Ignore `node_modules`.
- [x] Ignore nested `output` directory.
- [ ] Add explicit unit test for symlinked source roots.
- [ ] Add explicit unit test for source path that exists but is a file, not a directory.
- [ ] Add explicit unit test for unreadable directory behavior.
- [ ] Add explicit unit test for nested directories that contain multiple skill trees.
- [ ] Add explicit unit test for hidden directories other than `.git`.
- [ ] Add explicit unit test for source ordering when filesystem traversal order differs.
- [ ] Add explicit unit test for paths with spaces.
- [ ] Add explicit unit test for mixed-case skill names.
- [ ] Add explicit unit test for nested output directory below a source root.
- [ ] Add explicit integration test for large but shallow tree.
- [ ] Add explicit integration test for deep tree.
- [ ] `decision:` should discovery follow symlinked directories below a source tree.
- [ ] `decision:` should case sensitivity match platform semantics or remain byte-for-byte.

## 5. Resolution hardening

- [x] Preserve first-source-wins.
- [x] Preserve shadowed candidates for diagnostics.
- [x] Keep output deterministic.
- [ ] Add unit test for three-way shadowing across three sources.
- [ ] Add unit test for duplicate names within the same source.
- [ ] Add unit test for deterministic ordering when candidates share the same source index.
- [ ] Add explicit resolver output shape docs.
- [ ] Add notes in README describing that folder basename is the skill key.
- [ ] `decision:` if two candidates exist in one source, should lexicographic order win, first traversal win, or should that be treated as invalid source state.

## 6. Reconcile and filesystem safety

- [x] Create output directory if missing.
- [x] Create missing symlinks.
- [x] Update wrong managed symlinks.
- [x] Remove stale managed symlinks.
- [x] Preserve unmanaged files and directories.
- [x] Preserve unmanaged symlinks.
- [x] Track managed entries in manifest.
- [ ] Add unit test for stale managed symlink removal when target was deleted.
- [ ] Add unit test for unmanaged file blocking a desired skill.
- [ ] Add unit test for unmanaged directory blocking a desired skill.
- [ ] Add unit test for unmanaged symlink blocking a desired skill.
- [ ] Add unit test for managed symlink already correct.
- [ ] Add unit test for manifest cleanup after skill removal.
- [ ] Add unit test for output directory containing unrelated dotfiles.
- [ ] Add unit test for manifest corruption fallback behavior.
- [ ] Add explicit reconciliation summary type docs.
- [ ] Add file-lock or pid-lock design note.
- [ ] Implement coarse lock for concurrent `sync` runs.
- [ ] Add tests for concurrent `sync` behavior once lock exists.
- [ ] Review atomic rename strategy for portability.
- [ ] `decision:` should manifest write happen before or after symlink reconcile if a partial failure occurs.
- [ ] `verify:` manually test reconcile against a real temp tree with preexisting unmanaged entries.

## 7. Manifest lifecycle

- [x] Introduce manifest file.
- [ ] Add docs for what the manifest is and why it exists.
- [ ] Add explicit schema comments or JSON schema note.
- [ ] Add test for reading empty/missing manifest.
- [ ] Add test for invalid manifest JSON.
- [ ] Add test for manifest with unknown extra keys.
- [ ] Add migration strategy note in case manifest schema changes later.
- [ ] `decision:` keep manifest in `output` or move to per-user state directory later.

## 8. CLI UX and command behavior

- [x] Basic commands exist.
- [ ] Add top-level help examples in README.
- [ ] Add examples for each command in README.
- [ ] Add `--json` for `doctor`.
- [ ] Add `--verbose` for all commands or explicitly reject it until supported.
- [ ] Add `--quiet` for machine-oriented use or explicitly defer it.
- [ ] Add `--version` smoke test.
- [ ] Add stable exit codes for:
- [ ] config failure
- [ ] doctor found issues
- [ ] sync encountered blocking conflicts
- [ ] unexpected internal error
- [ ] Add CLI integration test for `status --json`.
- [ ] Add CLI integration test for `doctor`.
- [ ] Add CLI integration test for config parse failure.
- [ ] Add CLI integration test for missing config file.
- [ ] Add CLI integration test for successful `sync` creating links on disk.
- [ ] Add CLI integration test for `watch` startup and clean shutdown.
- [ ] `decision:` should `sync` print only the summary or the full resolved mapping.

## 9. Status output hardening

- [x] Human output exists.
- [x] JSON output exists.
- [ ] Add stable snapshot test for text output with one skill.
- [ ] Add stable snapshot test for text output with shadowed skills.
- [ ] Add stable snapshot test for text output with warnings.
- [ ] Add stable snapshot test for JSON output.
- [ ] Add explicit ordering test to ensure output is deterministic.
- [ ] Add compact summary line with total resolved, total shadowed, total warnings.
- [ ] Add optional source labels if config grows them.
- [ ] Add docs that status output is intended to answer “what skill is coming from where”.
- [ ] `decision:` whether warnings belong in `status` or should be separated into `doctor`.

## 10. Doctor hardening

- [x] Missing source detection exists.
- [x] Broken managed symlink detection exists.
- [x] Unmanaged output entry detection exists.
- [x] Shadowed skill reporting exists.
- [ ] Add JSON output mode.
- [ ] Add stable text snapshot tests.
- [ ] Add stable JSON snapshot tests.
- [ ] Add explicit issue code docs.
- [ ] Add output-permission failure reporting.
- [ ] Add manifest corruption reporting if relevant.
- [ ] Add blocking unmanaged entry classification separate from generic unmanaged entry.
- [ ] Add recommendation text for common issues.
- [ ] `decision:` whether shadowed skills belong in `doctor` by default or should be info-only.

## 11. Watch mode hardening

- [x] Filesystem watch exists.
- [x] Debounce exists.
- [x] Periodic full rescan exists.
- [ ] Add tests for `add`, `addDir`, `change`, `unlink`, and `unlinkDir`.
- [ ] Add test for repeated bursts being coalesced into one sync.
- [ ] Add test for periodic sync still firing after filesystem events.
- [ ] Add test for clean shutdown on SIGINT.
- [ ] Add test for clean shutdown on SIGTERM.
- [ ] Add test for sync rejection inside watch loop not crashing the watcher.
- [ ] Add backoff/retry note for noisy or unavailable trees.
- [ ] Document expected service model:
- [ ] manual `skilldir watch`
- [ ] launchd example
- [ ] systemd user service example
- [ ] `decision:` should watch skip missing sources silently until they appear, or log every cycle.

## 12. Testing expansion

### Core unit coverage

- [x] discovery tests exist
- [x] resolution tests exist
- [x] reconcile tests exist
- [x] status tests exist
- [x] doctor tests exist
- [x] watch debounce test exists
- [ ] add config unit tests
- [ ] add manifest unit tests
- [ ] add CLI command tests

### Integration coverage

- [x] sync integration exists
- [ ] add end-to-end CLI integration test suite using spawned process execution
- [ ] add integration test for nested source roots
- [ ] add integration test for output under one of the source roots
- [ ] add integration test for empty source set rejection
- [ ] add integration test for missing source warnings
- [ ] add integration test for broken managed symlink recovery
- [ ] add integration test for manual unmanaged output entry handling

### Fixture quality

- [ ] Create fixture helper for building source trees declaratively.
- [ ] Create fixture helper for creating unmanaged output entries.
- [ ] Create fixture helper for corrupt manifest files.
- [ ] Create fixture helper for broken symlinks.
- [ ] Create fixture helper for nested output-under-source setups.
- [ ] Create fixture helper for snapshot-friendly sample projects.

### Portability and platform coverage

- [ ] Add CI matrix note for Linux and macOS.
- [ ] Decide whether to add Windows CI now or defer.
- [ ] Add tests gated for symlink capability if Windows support is attempted.
- [ ] Add docs note about Node version and symlink permissions.

### Performance confidence

- [ ] Add large-tree synthetic benchmark script or test harness.
- [ ] Add test for many unique skills.
- [ ] Add test for many shadowed duplicates.
- [ ] Add measurement note for watch startup on large source sets.

## 13. Documentation and product clarity

- [x] README exists.
- [x] Architecture note exists.
- [x] Test plan exists.
- [x] Landing page exists.
- [ ] Update README from “planned commands” to “available commands”.
- [ ] Add real command output examples from the current implementation.
- [ ] Add “managed output directory” section to README.
- [ ] Add “what happens if someone adds a skill directly to output” section to README.
- [ ] Add “why no wrapper” rationale.
- [ ] Add “why no FUSE in MVP” rationale.
- [ ] Add “how to run in background” section.
- [ ] Add release/install instructions after publishing path is finalized.
- [ ] Add badges for CI and Pages once stable.
- [ ] Add concise architecture diagram to landing page.
- [ ] Add screenshots or sample output blocks to landing page.
- [ ] Add docs note on current known limitations.

## 14. CI, release, and repo operations

- [x] CI workflow exists.
- [x] Release workflow exists.
- [x] Changesets config exists.
- [ ] Verify Pages deployment from `site/`.
- [ ] Verify release workflow behavior on a real version PR or tag flow.
- [ ] Decide whether release workflow should publish to npm or just version/tag.
- [ ] If npm publish is enabled:
- [ ] create npm package
- [ ] add `NPM_TOKEN` secret
- [ ] add publish access/settings docs
- [ ] test dry-run publish locally
- [ ] Add branch protection recommendations to contributing docs.
- [ ] Add “required checks” recommendations to docs.
- [ ] Add CODEOWNERS if desired.
- [ ] Add Dependabot or Renovate if desired.
- [ ] Verify `.changeset/initial-release.md` flows correctly through the release workflow.

## 15. Source labels and richer config design

- [ ] Design optional `label` field per source.
- [ ] Decide JSON shape for labeled sources.
- [ ] Decide backward compatibility with plain string source arrays.
- [ ] Add status output with label support.
- [ ] Add JSON output support with labels.
- [ ] Add tests for labeled and unlabeled mixed configs.
- [ ] Document migration path if labels are introduced.

## 16. Remote-source and future architecture planning

- [ ] Define “remote materialized cache as another source root” in one architecture note.
- [ ] Decide whether the remote layer is:
- [ ] pull-to-cache only
- [ ] background daemon + cache
- [ ] registry + content-addressed cache
- [ ] Define cache directory layout.
- [ ] Define precedence interaction between remote cache and local sources.
- [ ] Define trust/security model for fetched skills.
- [ ] Define invalidation/update rules.
- [ ] Keep this as design-only until local source MVP is fully hardened.

## 17. Immediate next best sequence

- [ ] Step 1: add config unit tests.
- [ ] Step 2: add manifest unit tests.
- [ ] Step 3: add CLI integration tests for `status`, `sync`, and `doctor`.
- [ ] Step 4: add stable snapshot tests for status and doctor output.
- [ ] Step 5: add signal-handling and failure-path tests for watch mode.
- [ ] Step 6: decide `0.x` config format policy.
- [ ] Step 7: decide duplicate-in-source behavior.
- [ ] Step 8: document current command behavior in README and landing page.
- [ ] Step 9: verify Pages and release workflow behavior against the live repo.
- [ ] Step 10: only then start richer config or remote-source design work.
