#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfig } from './config.js';
import { renderDoctor, renderDoctorJson, runDoctor } from './doctor.js';
import { renderStatus, renderStatusJson } from './status.js';
import { runSync } from './sync.js';
import { CliOutputOptions } from './types.js';
import { runWatchCommand } from './watch-command.js';

type CommonOptions = {
  config: string;
};

type OutputOptions = CliOutputOptions;

const program = new Command();

program
  .name('skilldir')
  .description('Materialize a first-source-wins union of skill directories.')
  .version('0.1.0')
  .addHelpText(
    'after',
    `
Examples:
  skilldir sync --config ./skilldir.json
  skilldir status --config ./skilldir.json --json
  skilldir doctor --config ./skilldir.json
  skilldir watch --config ./skilldir.json
`,
  );

program
  .command('sync')
  .requiredOption('--config <path>', 'Path to JSON config file')
  .option('--quiet', 'Suppress normal sync output')
  .option('--verbose', 'Print extra sync diagnostics')
  .addHelpText(
    'after',
    `
Examples:
  skilldir sync --config ./skilldir.json
  skilldir sync --config ./skilldir.json --quiet
  skilldir sync --config ~/.config/skilldir/config.json
`,
  )
  .action(async (options: CommonOptions & OutputOptions) => {
    const config = await loadConfig(options.config);
    if (options.verbose) {
      process.stdout.write(
        `sync: trigger=manual sources=${config.sources.length} output=${config.output}\n`,
      );
    }
    const result = await runSync(config);
    if (options.verbose && result.metrics) {
      process.stdout.write(
        `sync: discovery ${result.metrics.discovery.durationMs.toFixed(1)}ms total across ${result.metrics.discovery.perSource.length} source(s)\n`,
      );
    }
    if (!options.quiet) {
      process.stdout.write(`${renderStatus(result)}\n`);
    }
  });

program
  .command('status')
  .requiredOption('--config <path>', 'Path to JSON config file')
  .option('--json', 'Render JSON output')
  .addHelpText(
    'after',
    `
Examples:
  skilldir status --config ./skilldir.json
  skilldir status --config ./skilldir.json --json
`,
  )
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
  .option('--json', 'Render JSON output')
  .addHelpText(
    'after',
    `
Examples:
  skilldir doctor --config ./skilldir.json
  skilldir doctor --config ./skilldir.json --json
`,
  )
  .action(async (options: CommonOptions & { json?: boolean }) => {
    const config = await loadConfig(options.config);
    const result = await runSync(config);
    const issues = await runDoctor(config, result);
    process.stdout.write(
      `${options.json ? renderDoctorJson(issues) : renderDoctor(issues)}\n`,
    );
    if (issues.length > 0) {
      process.exitCode = 1;
    }
  });

program
  .command('watch')
  .requiredOption('--config <path>', 'Path to JSON config file')
  .option('--quiet', 'Suppress normal status output while watching')
  .option('--verbose', 'Print trigger diagnostics while watching')
  .addHelpText(
    'after',
    `
Examples:
  skilldir watch --config ./skilldir.json
  skilldir watch --config ./skilldir.json --verbose
`,
  )
  .action(async (options: CommonOptions & OutputOptions) => {
    const config = await loadConfig(options.config);
    await runWatchCommand(config, options);
  });

try {
  await program.parseAsync(process.argv);
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
