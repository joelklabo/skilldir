import fs from 'node:fs/promises';
import path from 'node:path';
import { ManagedManifest } from './types.js';

export const MANIFEST_FILENAME = '.skilldir-manifest.json';

export function manifestPath(outputDir: string) {
  return path.join(outputDir, MANIFEST_FILENAME);
}

export async function readManifest(
  outputDir: string,
): Promise<ManagedManifest> {
  try {
    const raw = await fs.readFile(manifestPath(outputDir), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { version?: unknown }).version === 1 &&
      typeof (parsed as { managed?: unknown }).managed === 'object' &&
      (parsed as { managed?: unknown }).managed !== null
    ) {
      return parsed as ManagedManifest;
    }
  } catch {
    // noop
  }
  return { version: 1, managed: {} };
}

export async function writeManifest(
  outputDir: string,
  manifest: ManagedManifest,
): Promise<void> {
  await fs.writeFile(
    manifestPath(outputDir),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
}
