# Contributing

## Setup

```bash
pnpm install
pnpm check
```

## Development rules

- Keep the core `sync` path deterministic.
- Add tests before or alongside behavior changes.
- Prefer simple full-rescan logic over incremental state until profiling proves otherwise.
- Treat the output directory as managed state.
- Keep watch-mode logging intentionally small: default output is status, verbose output is trigger diagnostics.

## Release Flow

Changesets manages versioning for this repo.

```bash
pnpm changeset
pnpm version-packages
pnpm build
```

The GitHub release workflow is now configured to open the version PR from `changeset-release/main` automatically.

### Release Checklist

- Run `pnpm check`.
- Add or update a changeset with `pnpm changeset`.
- Review the generated version changes with `pnpm version-packages`.
- Confirm the Pages site still matches the current CLI/docs behavior.
- Push only the intended release-prep changes.
- Verify whether the repository settings now allow GitHub Actions to open the version PR.
  This is currently configured correctly.

## Test Fixtures

- Put reusable config and tree fixtures under `test/fixtures`.
- Prefer small fixture trees that model one behavior clearly.
- For one-off filesystem scenarios, use temp directories in the test instead of growing the fixture tree.

## Validate Pages Locally

The Pages site is static in `site/index.html`. Review it locally with any static file server, for example:

```bash
python3 -m http.server 8000 --directory site
```

## Branch And Commit Hygiene

- Keep commits scoped to one coherent behavior or documentation slice.
- Run `pnpm check` before pushing.
- Do not mix unrelated backlog cleanup into the same commit just because the files are nearby.
- Prefer direct, descriptive commit messages over catch-all “update docs” commits.

## Branch Protection Recommendations

- Require green CI on `main` before merge.
- Require at least one review for release-policy or workflow changes.
- Block force-pushes to `main`.
- Restrict direct pushes to `main` if the repo starts taking outside contributions.

Current maintainer policy:

- keep `main` gated on green CI
- review release PRs manually
- keep npm publishing deferred until the package contract is considered stable
- do not add CI coverage uploads or build artifacts unless they solve a concrete debugging problem

## Support Triage

- Reproduce with `pnpm check` first.
- If the report is about discovery or reconciliation, ask for the exact config and a minimal source tree.
- If the report is about release automation, check repository Actions permissions before changing workflow code.
- If the report is about Pages content, compare `site/index.html` with the current README and CLI output.
