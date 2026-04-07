import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MANIFEST_FILENAME,
  readManifest,
  writeManifest,
} from '../src/manifest.js';
import { makeTempDir } from './helpers.js';

describe('manifest', () => {
  it('writes the manifest atomically without leaving temp files behind', async () => {
    const output = await makeTempDir('skilldir-manifest-');

    await writeManifest(output, {
      version: 1,
      managed: {
        playwright: '/tmp/playwright',
      },
    });

    const entries = await fs.readdir(output);
    expect(entries).toContain(MANIFEST_FILENAME);
    expect(entries.some((entry) => entry.includes('.tmp-'))).toBe(false);
    expect(await readManifest(output)).toEqual({
      version: 1,
      managed: {
        playwright: '/tmp/playwright',
      },
    });
  });

  it('overwrites an existing manifest via replace semantics', async () => {
    const output = await makeTempDir('skilldir-manifest-rewrite-');
    const manifestPath = path.join(output, MANIFEST_FILENAME);

    await fs.writeFile(
      manifestPath,
      JSON.stringify({ version: 1, managed: { stale: '/tmp/stale' } }),
      'utf8',
    );

    await writeManifest(output, {
      version: 1,
      managed: {
        fresh: '/tmp/fresh',
      },
    });

    expect(await fs.readFile(manifestPath, 'utf8')).toContain('"fresh"');
    expect(await fs.readFile(manifestPath, 'utf8')).not.toContain('"stale"');
  });
});
