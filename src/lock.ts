import fs from 'node:fs/promises';
import path from 'node:path';
import { LockInfo } from './types.js';

export const LOCK_FILENAME = '.skilldir.lock';

export function lockPath(outputDir: string) {
  return path.join(outputDir, LOCK_FILENAME);
}

function isProcessAlive(pid: number | undefined): boolean {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readLockInfo(filePath: string): Promise<LockInfo | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as { pid?: unknown } | null;
    if (parsed && typeof parsed === 'object') {
      const info: LockInfo = {
        path: filePath,
        reason: 'already-locked',
      };
      if (typeof parsed.pid === 'number') {
        info.pid = parsed.pid;
      }
      return info;
    }
  } catch {
    // noop
  }
  return null;
}

export async function acquireOutputLock(outputDir: string): Promise<{
  release: () => Promise<void>;
}> {
  const resolvedOutput = path.resolve(outputDir);
  await fs.mkdir(resolvedOutput, { recursive: true });
  const filePath = lockPath(resolvedOutput);
  while (true) {
    let handle: fs.FileHandle;
    try {
      handle = await fs.open(filePath, 'wx');
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'EEXIST') {
        const info = await readLockInfo(filePath);
        if (info && !isProcessAlive(info.pid)) {
          await fs.rm(filePath, { force: true }).catch(() => {});
          continue;
        }
        throw new Error(
          info?.pid
            ? `Output is already locked by pid ${info.pid}: ${filePath}. Another sync/watch process is active.`
            : `Output is already locked: ${filePath}. Another sync/watch process is active.`,
        );
      }
      throw error;
    }

    await handle.writeFile(
      JSON.stringify(
        {
          pid: process.pid,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ) + '\n',
      'utf8',
    );

    return {
      async release() {
        await handle.close();
        await fs.rm(filePath, { force: true });
      },
    };
  }
}
