import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { runWatchCommand } from '../src/watch-command.js';
import { SyncConfig } from '../src/types.js';

class MockSignalSource extends EventEmitter {
  stdout = {
    write: vi.fn(),
  };
}

const config: SyncConfig = {
  sources: ['/tmp/source'],
  output: '/tmp/output',
};

describe('runWatchCommand', () => {
  it('runs startup sync before wiring watch-triggered syncs', async () => {
    const triggers: string[] = [];
    let watchSync:
      | ((trigger: 'filesystem' | 'interval' | 'startup') => Promise<void>)
      | null = null;
    const signalSource = new MockSignalSource();

    await runWatchCommand(
      config,
      {},
      {
        signalSource,
        runSyncFn: () =>
          Promise.resolve({
            resolved: new Map(),
            created: [],
            updated: [],
            removed: [],
            warnings: [],
          }),
        renderStatusFn: () => 'status output',
        writeLine: (line) => triggers.push(line),
        startWatchFn: (watchConfig, deps) => {
          expect(watchConfig).toEqual(config);
          watchSync = deps.sync;
          return {
            close: async () => {},
          };
        },
      },
    );

    expect(triggers).toEqual(['status output']);
    await watchSync?.('filesystem');
    expect(triggers).toEqual(['status output', 'status output']);
  });

  it('logs trigger sources in verbose mode and suppresses status in quiet mode', async () => {
    const lines: string[] = [];
    let watchSync:
      | ((trigger: 'filesystem' | 'interval' | 'startup') => Promise<void>)
      | null = null;

    await runWatchCommand(
      config,
      { quiet: true, verbose: true },
      {
        signalSource: new MockSignalSource(),
        runSyncFn: () =>
          Promise.resolve({
            resolved: new Map(),
            created: [],
            updated: [],
            removed: [],
            warnings: [],
          }),
        renderStatusFn: () => 'status output',
        writeLine: (line) => lines.push(line),
        startWatchFn: (_watchConfig, deps) => {
          watchSync = deps.sync;
          return {
            close: async () => {},
          };
        },
      },
    );

    await watchSync?.('filesystem');
    await watchSync?.('interval');

    expect(lines).toEqual([
      'watch: sync trigger=startup',
      'watch: sync trigger=filesystem',
      'watch: sync trigger=interval',
    ]);
  });

  it('closes cleanly on SIGINT and SIGTERM', async () => {
    const close = vi.fn(async () => {});
    const signalSource = new MockSignalSource();

    await runWatchCommand(
      config,
      {},
      {
        signalSource,
        runSyncFn: () =>
          Promise.resolve({
            resolved: new Map(),
            created: [],
            updated: [],
            removed: [],
            warnings: [],
          }),
        renderStatusFn: () => 'status output',
        writeLine: () => {},
        startWatchFn: () => ({ close }),
      },
    );

    signalSource.emit('SIGINT');
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));

    signalSource.emit('SIGTERM');
    await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });
});
