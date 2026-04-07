import chokidar, { FSWatcher } from 'chokidar';
import { SyncConfig } from './types.js';

export type WatchDependencies = {
  sync: () => Promise<void>;
  createWatcher?: (paths: string[]) => FSWatcher;
  setTimeoutFn?: typeof setTimeout;
  setIntervalFn?: typeof setInterval;
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
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeoutFn(() => {
      timer = null;
      void deps.sync();
    }, 200);
  };
  const watcher = createWatcher(config.sources);
  watcher.on('add', schedule);
  watcher.on('addDir', schedule);
  watcher.on('change', schedule);
  watcher.on('unlink', schedule);
  watcher.on('unlinkDir', schedule);
  const interval = setIntervalFn(
    () => {
      void deps.sync();
    },
    10 * 60 * 1000,
  );
  return {
    async close() {
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      await watcher.close();
    },
  };
}
