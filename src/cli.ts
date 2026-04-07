#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfig } from './config.js';
import { renderDoctor, runDoctor } from './doctor.js';
import { renderStatus, renderStatusJson } from './status.js';
import { runSync } from './sync.js';
import { startWatch } from './watch.js';

type CommonOptions = {
  config: string;
};

const program = new Command();

program
  .name('skilldir')
  .description('Materialize a first-source-wins union of skill directories.');

program
  .command('sync')
  .requiredOption('--config <path>', 'Path to JSON config file')
  .action(async (options: CommonOptions) => {
    const config = await loadConfig(options.config);
    const result = await runSync(config);
    process.stdout.write(`${renderStatus(result)}\n`);
  });

program
  .command('status')
  .requiredOption('--config <path>', 'Path to JSON config file')
  .option('--json', 'Render JSON output')
  .action(async (options: CommonOptions & { json?: boolean }) => {
    const config = await loadConfig(options.config);
    const result = await runSync(config);
    process.stdout.write(
      `${options.json ? renderStatusJson(result) : renderStatus(result)}\n`,
    );
  });

program
  .command('doctor')
  .requiredOption('--config <path>', 'Path to JSON config file')
  .action(async (options: CommonOptions) => {
    const config = await loadConfig(options.config);
    const result = await runSync(config);
    const issues = await runDoctor(config, result);
    process.stdout.write(`${renderDoctor(issues)}\n`);
  });

program
  .command('watch')
  .requiredOption('--config <path>', 'Path to JSON config file')
  .action(async (options: CommonOptions) => {
    const config = await loadConfig(options.config);
    const sync = async () => {
      const result = await runSync(config);
      process.stdout.write(`${renderStatus(result)}\n`);
    };
    await sync();
    const handle = startWatch(config, { sync });
    const shutdown = async () => {
      await handle.close();
      process.exit(0);
    };
    process.on('SIGINT', () => void shutdown());
    process.on('SIGTERM', () => void shutdown());
  });

void program.parseAsync(process.argv);
