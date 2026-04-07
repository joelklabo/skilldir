# skilldir Todo

This list is intentionally granular. The goal is to keep the product honest, testable, and easy to sequence.

## 0. Product Framing

- [x] Choose a clear name: `skilldir`
- [x] Define the MVP rule: first source wins
- [x] Define skill identity: directory basename containing `SKILL.md`
- [x] Decide not to wrap harness startup for MVP
- [x] Decide not to auto-move unmanaged output entries
- [ ] Confirm the initial consumer directories to mention in docs
- [ ] Decide whether JSON remains the only config format in `0.x`

## 1. Repository Bootstrap

- [x] Create a dedicated git repository
- [x] Add `package.json`
- [x] Add TypeScript config
- [x] Add linting config
- [x] Add formatting config
- [x] Add test runner config
- [x] Add MIT license
- [x] Add issue templates
- [x] Add pull request template
- [x] Add contributing guide
- [x] Add code of conduct

## 2. Core Domain Model

- [x] Define `SkillCandidate`
- [x] Define `ResolvedSkill`
- [x] Define sync warnings and diagnostics
- [x] Define config shape
- [ ] Decide whether to add a source label field for clearer `status` output
- [ ] Decide whether to expose a stable JSON schema for config

## 3. Discovery

- [x] Walk source directories recursively
- [x] Detect skill directories by `SKILL.md`
- [x] Ignore `node_modules`
- [x] Ignore `.git`
- [x] Ignore the output directory if it is nested beneath a source
- [ ] Add explicit tests for symlinked source roots
- [ ] Add explicit tests for unreadable directories
- [ ] Decide whether hidden directories other than `.git` should be ignored

## 4. Resolution

- [x] Resolve by ordered source precedence
- [x] Preserve shadowed candidates for diagnostics
- [x] Keep output deterministic
- [ ] Add explicit tie-break notes for duplicates within the same source
- [ ] Decide whether duplicates in one source are a hard error or a warning

## 5. Reconciliation

- [x] Create output directory if missing
- [x] Create symlink for each winning skill
- [x] Update wrong managed symlink targets
- [x] Remove stale managed symlinks
- [x] Preserve unmanaged directories/files in output
- [x] Preserve unmanaged symlinks in output
- [x] Write a manifest of managed symlinks
- [ ] Decide whether manifest should live in output or app-state path long term
- [ ] Add lock protection for concurrent `sync` runs
- [ ] Add stronger atomic replacement semantics for Windows support

## 6. Status

- [x] Print human-readable winners
- [x] Print shadowed entries
- [x] Add JSON output mode
- [ ] Add colorized terminal output
- [ ] Add compact summary line counts
- [ ] Add source labels if config grows them

## 7. Doctor

- [x] Report missing source paths
- [x] Report broken managed symlinks
- [x] Report unmanaged output entries
- [x] Report shadowed skills
- [ ] Report config file parse errors more ergonomically
- [ ] Report output directory ownership/permission issues

## 8. Watch Mode

- [x] Add filesystem watch loop
- [x] Debounce repeated changes
- [x] Add periodic full rescan backstop
- [ ] Add signal handling tests for clean shutdown
- [ ] Add stronger overflow recovery behavior for noisy trees

## 9. Testing

- [x] Add unit tests for discovery
- [x] Add unit tests for resolution
- [x] Add unit tests for reconciliation
- [x] Add unit tests for status output
- [x] Add unit tests for doctor output
- [x] Add watch-mode tests for debounce behavior
- [x] Add full sync integration tests over temp source trees
- [ ] Add CLI integration tests that execute built commands
- [ ] Add snapshot tests for human-readable status/doctor output
- [ ] Add matrix tests for nested source/output combinations
- [ ] Add tests for very large source trees

## 10. CI / Release

- [x] Add CI workflow for install, lint, typecheck, test, build
- [x] Add release workflow scaffold
- [x] Add Changesets config
- [ ] Wire npm publishing after package ownership is decided
- [ ] Add branch protection recommendations to docs
- [ ] Add badges to README

## 11. Landing Page

- [x] Add a simple static site scaffold
- [x] Explain the first-source-wins model
- [x] Show sample config and output
- [ ] Deploy with GitHub Pages
- [ ] Add a concise diagram
- [ ] Add release/install instructions once package is publishable

## 12. Post-MVP

- [ ] Support YAML/TOML config
- [ ] Support labeled sources
- [ ] Support remote materialized cache as another source
- [ ] Add fs-lock or pid-lock for concurrent processes
- [ ] Add systemd/launchd examples
- [ ] Add adoption command for unmanaged output entries as an explicit user action
- [ ] Explore FUSE only if ordinary symlink materialization proves insufficient
