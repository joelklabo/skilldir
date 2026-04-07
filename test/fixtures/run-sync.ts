import fs from 'node:fs/promises';
import { runSync } from '../../src/sync.js';

const configPath = process.argv[2];

if (!configPath) {
  process.stderr.write('missing config path\n');
  process.exit(1);
}

try {
  const raw = await fs.readFile(configPath, 'utf8');
  const config = JSON.parse(raw) as { sources: string[]; output: string };
  await runSync(config);
  process.exit(0);
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
}
