import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.join(__dirname, 'fixtures');

export async function makeTempDir(prefix: string) {
  return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function createSkill(root: string, name: string) {
  const dir = path.join(root, name);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'SKILL.md'), `# ${name}\n`, 'utf8');
  return dir;
}

export async function copyFixtureTree(
  name: string,
  prefix = 'skilldir-fixture-',
) {
  const destination = await makeTempDir(prefix);
  await fs.cp(path.join(fixturesRoot, name), destination, { recursive: true });
  return destination;
}

export async function writeConfig(
  configPath: string,
  config: { sources: string[]; output: string },
) {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
}

export async function readSymlinkTarget(linkPath: string) {
  const target = await fs.readlink(linkPath);
  return path.resolve(path.dirname(linkPath), target);
}
