import { describe, expect, it, vi } from 'vitest';
import { startWatch } from '../src/watch.js';

describe('watch', () => {
  it('debounces filesystem events and runs periodic sync', async () => {
    vi.useFakeTimers();
    let changeHandler: (() => void) | undefined;
    const sync = vi.fn(async () => {});
    const handle = startWatch(
      { sources: ['/tmp/source'], output: '/tmp/output' },
      {
        sync,
        createWatcher: () =>
          ({
            on(event: string, handler: () => void) {
              if (event === 'change') changeHandler = handler;
              return this;
            },
            close: async () => {},
          }) as never,
      },
    );
    changeHandler?.();
    changeHandler?.();
    await vi.advanceTimersByTimeAsync(199);
    expect(sync).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(sync).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(sync).toHaveBeenCalledTimes(2);
    await handle.close();
    vi.useRealTimers();
  });
});
