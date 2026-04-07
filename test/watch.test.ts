import { describe, expect, it, vi } from 'vitest';
import { startWatch } from '../src/watch.js';

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
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(sync).toHaveBeenCalledTimes(2);

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

    handlers.get('addDir')?.();
    await vi.advanceTimersByTimeAsync(200);
    expect(sync).toHaveBeenCalledTimes(2);

    await handle.close();
    vi.useRealTimers();
  });
});
