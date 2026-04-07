import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { makeTempDir } from './helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.join(__dirname, 'fixtures', 'configs');

describe('loadConfig', () => {
  it('resolves relative paths from the config file directory', async () => {
    const root = await makeTempDir('skilldir-config-relative-');
    const nested = path.join(root, 'nested');
    await fs.mkdir(nested, { recursive: true });
    const configPath = path.join(nested, 'skilldir.json');
    await fs.writeFile(
      configPath,
      JSON.stringify({
        sources: ['../sources/a', './sources/b'],
        output: './out',
      }),
      'utf8',
    );

    const config = await loadConfig(configPath);

    expect(config.sources).toEqual([
      path.join(root, 'sources', 'a'),
      path.join(nested, 'sources', 'b'),
    ]);
    expect(config.output).toBe(path.join(nested, 'out'));
  });

  it('expands home-directory paths', async () => {
    const root = await makeTempDir('skilldir-config-home-');
    const configPath = path.join(root, 'skilldir.json');
    await fs.writeFile(
      configPath,
      JSON.stringify({
        sources: ['~/skilldir-source'],
        output: '~/skilldir-output',
      }),
      'utf8',
    );

    const config = await loadConfig(configPath);

    expect(config.sources[0]).toBe(path.join(os.homedir(), 'skilldir-source'));
    expect(config.output).toBe(path.join(os.homedir(), 'skilldir-output'));
  });

  it('wraps parse errors with the config path', async () => {
    const root = await makeTempDir('skilldir-config-parse-');
    const configPath = path.join(root, 'skilldir.json');
    await fs.writeFile(configPath, '{"sources":[}', 'utf8');

    await expect(loadConfig(configPath)).rejects.toThrow(
      `Could not parse config ${configPath}:`,
    );
  });

  it('loads a valid fixture config', async () => {
    const configPath = path.join(fixturesRoot, 'valid-relative.json');

    const config = await loadConfig(configPath);

    expect(config.sources).toEqual([
      path.join(__dirname, 'fixtures', 'example', 'source-a'),
      path.join(__dirname, 'fixtures', 'example', 'source-b'),
    ]);
    expect(config.output).toBe(
      path.join(__dirname, 'fixtures', 'generated', 'output'),
    );
  });

  it('rejects an invalid fixture config', async () => {
    const configPath = path.join(fixturesRoot, 'invalid-missing-output.json');

    await expect(loadConfig(configPath)).rejects.toThrow(
      `Config ${configPath} field "output" must be a non-empty string.`,
    );
  });
});
