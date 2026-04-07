import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { acquireOutputLock, lockPath } from '../src/lock.js';
import { makeTempDir } from './helpers.js';

describe('acquireOutputLock', () => {
  it('prevents concurrent acquisition and releases cleanly', async () => {
    const root = await makeTempDir('skilldir-lock-');
    const output = path.join(root, 'output');

    const first = await acquireOutputLock(output);
    await expect(acquireOutputLock(output)).rejects.toThrow(
      'Output is already locked',
    );
    expect(await fs.readFile(lockPath(output), 'utf8')).toContain('"pid"');

    await first.release();

    const second = await acquireOutputLock(output);
    await second.release();
    await expect(fs.access(lockPath(output))).rejects.toThrow();
  });

  it('reclaims a stale lock file owned by a dead pid', async () => {
    const root = await makeTempDir('skilldir-stale-lock-');
    const output = path.join(root, 'output');
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(
      lockPath(output),
      JSON.stringify({
        pid: 999999,
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
      'utf8',
    );

    const lock = await acquireOutputLock(output);
    await lock.release();
    await expect(fs.access(lockPath(output))).rejects.toThrow();
  });
});
