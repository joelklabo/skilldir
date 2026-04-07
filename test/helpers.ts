import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function makeTempDir(prefix: string) {
  return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function createSkill(root: string, name: string) {
  const dir = path.join(root, name);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'SKILL.md'), `# ${name}\n`, 'utf8');
  return dir;
}

export async function readSymlinkTarget(linkPath: string) {
  const target = await fs.readlink(linkPath);
  return path.resolve(path.dirname(linkPath), target);
}
