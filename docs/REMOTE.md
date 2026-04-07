# Remote Source Design

This document defines the intended remote-source model before implementation work begins.

## Product contract

- Remote support does not ship in the `0.x` local-only contract. It is planned for `1.0`.
- The first remote version is read-only.
- Remote support is opt-in per source entry.
- Remote sources participate in the same first-source-wins ordering as local sources.
- Remote-fetched skills are still materialized as ordinary local directories before reconciliation.
- Remote cache paths are internal implementation details, not part of the public contract.

## Config shape

Remote and local sources share one `sources[]` array.

- A string entry continues to mean a local source path.
- A remote source uses an object entry.

Planned shape:

```json
{
  "sources": [
    "/home/honk/code/project/.agents/skills",
    {
      "type": "remote",
      "url": "http://127.0.0.1:4323/v1",
      "auth": {
        "type": "bearer-env",
        "env": "SKILLDIR_TOKEN"
      },
      "refreshTtlSeconds": 300,
      "integrity": "required",
      "label": "local-registry",
      "description": "Local skill registry"
    }
  ],
  "output": "/home/honk/.agents/skills"
}
```

Planned remote fields:

- `type`: must be `"remote"`
- `url`: remote API base URL
- `auth`: first version supports env-based bearer tokens
- `refreshTtlSeconds`: cached index freshness window
- `integrity`: first version uses `"required"` only
- `label`: optional human-friendly label for docs and future diagnostics
- `description`: optional operator-facing description

## Discovery and resolution model

The remote source model is index-first:

1. Fetch or reuse the remote source index metadata.
2. Treat the index entries as candidate skill names for resolution.
3. Apply the normal first-source-wins rule across local and remote candidates.
4. Fetch remote content only for remote winners.
5. Materialize fetched content into the local cache.
6. Reconcile the output directory as symlinks to local materialized directories.

This means:

- remote sources prefetch the full index metadata
- remote sources do not fetch every archive eagerly
- `status` should eventually show the local cache path plus remote origin metadata for remote winners
- `doctor` should eventually report stale remote metadata separately from local-source issues

## Cache layout

Planned cache root:

```text
~/.local/share/skilldir/remote/
```

Planned layout:

```text
~/.local/share/skilldir/remote/
  objects/
    sha256-<digest>/
      <skill files>
  sources/
    <source-hash>/
      index.json
      state.json
```

Design decisions:

- extracted objects are keyed by digest
- source-specific metadata lives under `sources/<source-hash>/`
- cache entries are shared across configs on one machine
- extraction happens into a temp directory and is published with rename semantics
- cache garbage collection is a future explicit feature, not implicit during normal sync

## Remote payload format

The first remote version should use `.tar.gz` payloads.

Required metadata per remote skill entry:

- `key`
- `version`
- `digest`
- `archiveUrl`

Design decisions:

- the remote source returns a digest before download
- the client verifies the digest after download
- digest verification is mandatory
- signatures are out of scope for the first remote version
- archive extraction must reject path traversal attempts

## Auth and trust

First-version auth decisions:

- credentials come from env vars, not inline config secrets
- first auth mode is bearer-token-from-env
- remote sources are treated as trusted operators once explicitly configured
- logs and errors must redact credential values

This keeps the first version small and avoids inventing a secret-storage layer inside `skilldir`.

## Failure behavior

Planned behavior:

- if index refresh fails but a cached index exists, continue with a warning
- if no cached index exists and the remote source cannot be reached, surface a sync failure for that source
- if archive fetch fails for a remote winner and no cached extracted object exists, fail that winner
- if a cached extracted object exists for the exact digest, reuse it and warn
- remote failures should be warnings only when stale cache can still satisfy the same resolved winner

## Compatibility

Remote support does not change the harness contract.

- harnesses still read normal on-disk skill directories
- the output directory remains a symlink directory only
- no runtime plugin or harness wrapper is required

## Operational commands

Planned first-version operational stance:

- no dedicated `cache prune` command until cache growth justifies it
- no dedicated `cache warm` command in the first remote cut
- remote refresh belongs in `watch` mode on an interval once remote support exists
- verbose logs should eventually report remote fetches, cache hits, and failures

## Rollout

- `0.x`: local-only contract
- `1.0` phase R1: remote materialized cache can be used as a manually populated local source
- `1.0` phase R2: managed remote index refresh
- `1.0` phase R3: managed archive fetch, verify, and extract
- `1.0` phase R4: watch-mode remote refresh
- later: stronger trust features only if real usage justifies them
