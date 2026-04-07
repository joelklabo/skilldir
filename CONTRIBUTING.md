# Contributing

## Setup

```bash
pnpm install
pnpm test
pnpm build
```

## Development rules

- Keep the core `sync` path deterministic.
- Add tests before or alongside behavior changes.
- Prefer simple full-rescan logic over incremental state until profiling proves otherwise.
- Treat the output directory as managed state.
