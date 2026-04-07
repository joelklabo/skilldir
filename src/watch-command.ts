import { renderStatus } from './status.js';
import { runSync } from './sync.js';
import { SyncConfig, CliOutputOptions, SyncResult } from './types.js';
import { startWatch, WatchDependencies, WatchTrigger } from './watch.js';

type SignalSource = Pick<
  NodeJS.Process,
  'on' | 'off' | 'removeListener' | 'stdout'
>;

export type WatchCommandDependencies = {
  runSyncFn?: (config: SyncConfig) => Promise<SyncResult>;
  renderStatusFn?: (result: SyncResult) => string;
  startWatchFn?: typeof startWatch;
  signalSource?: SignalSource;
  writeLine?: (line: string) => void;
  watchDependencies?: Omit<WatchDependencies, 'sync'>;
};

function removeSignalListener(
  source: SignalSource,
  signal: 'SIGINT' | 'SIGTERM',
  handler: () => void,
) {
  if (typeof source.off === 'function') {
    source.off(signal, handler);
    return;
  }
  source.removeListener(signal, handler);
}

export async function runWatchCommand(
  config: SyncConfig,
  options: CliOutputOptions,
  deps: WatchCommandDependencies = {},
) {
  const runSyncFn = deps.runSyncFn ?? runSync;
  const renderStatusFn = deps.renderStatusFn ?? renderStatus;
  const startWatchFn = deps.startWatchFn ?? startWatch;
  const signalSource = deps.signalSource ?? process;
  const writeLine =
    deps.writeLine ??
    ((line: string) => signalSource.stdout.write(`${line}\n`));

  const syncOnce = async (trigger: WatchTrigger) => {
    const result = await runSyncFn(config);
    if (options.verbose) {
      writeLine(`watch: sync trigger=${trigger}`);
      if (result.metrics) {
        writeLine(
          `watch: discovery ${result.metrics.discovery.durationMs.toFixed(1)}ms total across ${result.metrics.discovery.perSource.length} source(s)`,
        );
      }
    }
    if (!options.quiet) {
      writeLine(renderStatusFn(result));
    }
  };

  await syncOnce('startup');
  const handle = startWatchFn(config, {
    ...deps.watchDependencies,
    sync: syncOnce,
  });

  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    removeSignalListener(signalSource, 'SIGINT', onSigInt);
    removeSignalListener(signalSource, 'SIGTERM', onSigTerm);
    await handle.close();
  };

  const onSigInt = () => {
    void close();
  };
  const onSigTerm = () => {
    void close();
  };

  signalSource.on('SIGINT', onSigInt);
  signalSource.on('SIGTERM', onSigTerm);

  return { close };
}
