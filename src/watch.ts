import chokidar, { FSWatcher } from 'chokidar';
import { SyncConfig } from './types.js';

export type WatchTrigger = 'filesystem' | 'interval' | 'startup';

export type WatchDependencies = {
  sync: (trigger: WatchTrigger) => Promise<void>;
  createWatcher?: (paths: string[]) => FSWatcher;
  setTimeoutFn?: typeof setTimeout;
  setIntervalFn?: typeof setInterval;
  debounceMs?: number;
  intervalMs?: number;
};

export function startWatch(config: SyncConfig, deps: WatchDependencies) {
  const createWatcher =
    deps.createWatcher ??
    ((paths) =>
      chokidar.watch(paths, {
        ignoreInitial: true,
      }));
  const setTimeoutFn = deps.setTimeoutFn ?? setTimeout;
  const setIntervalFn = deps.setIntervalFn ?? setInterval;
  const debounceMs = deps.debounceMs ?? 200;
  const intervalMs = deps.intervalMs ?? 10 * 60 * 1000;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeoutFn(() => {
      timer = null;
      void deps.sync('filesystem');
    }, debounceMs);
  };
  const watcher = createWatcher(
    config.sources.filter(
      (source): source is string => typeof source === 'string',
    ),
  );
  watcher.on('add', schedule);
  watcher.on('addDir', schedule);
  watcher.on('change', schedule);
  watcher.on('unlink', schedule);
  watcher.on('unlinkDir', schedule);
  const interval = setIntervalFn(() => {
    void deps.sync('interval');
  }, intervalMs);
  return {
    async close() {
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      await watcher.close();
    },
  };
}
