import { describe, expect, it, vi } from 'vitest';
import { runSync } from '../src/sync.js';
import { startWatch } from '../src/watch.js';
import { createSkill, makeTempDir, readSymlinkTarget } from './helpers.js';

describe('watch', () => {
  it('debounces filesystem events and runs periodic sync', async () => {
    vi.useFakeTimers();
    const handlers = new Map<string, () => void>();
    const sync = vi.fn(async () => {});
    const handle = startWatch(
      { sources: ['/tmp/source'], output: '/tmp/output' },
      {
        sync,
        createWatcher: () =>
          ({
            on(event: string, handler: () => void) {
              handlers.set(event, handler);
              return this;
            },
            close: async () => {},
          }) as never,
      },
    );
    handlers.get('change')?.();
    handlers.get('add')?.();
    await vi.advanceTimersByTimeAsync(199);
    expect(sync).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(sync).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(sync).toHaveBeenCalledTimes(2);
    expect(sync).toHaveBeenNthCalledWith(1, 'filesystem');
    expect(sync).toHaveBeenNthCalledWith(2, 'interval');
    await handle.close();
    vi.useRealTimers();
  });

  it('debounces burst changes across multiple watched event types', async () => {
    vi.useFakeTimers();
    const handlers = new Map<string, () => void>();
    const sync = vi.fn(async () => {});
    const handle = startWatch(
      { sources: ['/tmp/source'], output: '/tmp/output' },
      {
        sync,
        createWatcher: () =>
          ({
            on(event: string, handler: () => void) {
              handlers.set(event, handler);
              return this;
            },
            close: async () => {},
          }) as never,
      },
    );

    handlers.get('addDir')?.();
    handlers.get('unlink')?.();
    handlers.get('unlinkDir')?.();
    handlers.get('change')?.();

    await vi.advanceTimersByTimeAsync(200);
    expect(sync).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledWith('filesystem');

    await handle.close();
    vi.useRealTimers();
  });

  it('runs periodic resyncs without filesystem events', async () => {
    vi.useFakeTimers();
    const sync = vi.fn(async () => {});
    const handle = startWatch(
      { sources: ['/tmp/source'], output: '/tmp/output' },
      {
        sync,
        createWatcher: () =>
          ({
            on() {
              return this;
            },
            close: async () => {},
          }) as never,
      },
    );

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(sync).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenNthCalledWith(1, 'interval');
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(sync).toHaveBeenCalledTimes(2);
    expect(sync).toHaveBeenNthCalledWith(2, 'interval');

    await handle.close();
    vi.useRealTimers();
  });

  it('schedules syncs for source deletion and recreation events', async () => {
    vi.useFakeTimers();
    const handlers = new Map<string, () => void>();
    const sync = vi.fn(async () => {});
    const handle = startWatch(
      { sources: ['/tmp/source'], output: '/tmp/output' },
      {
        sync,
        createWatcher: () =>
          ({
            on(event: string, handler: () => void) {
              handlers.set(event, handler);
              return this;
            },
            close: async () => {},
          }) as never,
      },
    );

    handlers.get('unlinkDir')?.();
    await vi.advanceTimersByTimeAsync(200);
    expect(sync).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenNthCalledWith(1, 'filesystem');

    handlers.get('addDir')?.();
    await vi.advanceTimersByTimeAsync(200);
    expect(sync).toHaveBeenCalledTimes(2);
    expect(sync).toHaveBeenNthCalledWith(2, 'filesystem');

    await handle.close();
    vi.useRealTimers();
  });

  it('recreates the output directory on periodic resync if it is deleted while watching', async () => {
    vi.useFakeTimers();
    const root = await makeTempDir('skilldir-watch-output-delete-');
    const source = `${root}/source`;
    const output = `${root}/output`;
    const skillDir = await createSkill(source, 'playwright');

    await runSync({ sources: [source], output });

    const handle = startWatch(
      { sources: [source], output },
      {
        sync: async () => {
          await runSync({ sources: [source], output });
        },
        createWatcher: () =>
          ({
            on() {
              return this;
            },
            close: async () => {},
          }) as never,
        intervalMs: 100,
      },
    );

    await import('node:fs/promises').then((fs) =>
      fs.rm(output, { recursive: true, force: true }),
    );

    await vi.advanceTimersByTimeAsync(100);
    await vi.waitFor(async () => {
      expect(await readSymlinkTarget(`${output}/playwright`)).toBe(skillDir);
    });

    await handle.close();
    vi.useRealTimers();
  });
});
