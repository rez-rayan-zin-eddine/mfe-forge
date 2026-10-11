#!/usr/bin/env node
import { program } from 'commander'
import chalk from 'chalk'
import { createRequire } from 'module'
import { initCommand } from '../commands/init.js'
import { generateCommand } from '../commands/generate.js'
import { devCommand } from '../commands/dev.js'
import { buildCommand } from '../commands/build.js'
import { testCommand } from '../commands/test.js'
import { syncCommand } from '../commands/sync.js'
import { doctorCommand } from '../commands/doctor.js'
import { configCommand } from '../commands/config.js'
import { CliError, ExitCode } from '../utils/exit.js'
import { statusCommand, graphCommand, inspectCommand, depsCommand, checkCommand, migrateCommand } from '../commands/diagnostics.js'

const require = createRequire(import.meta.url)
const pkg = require('../../package.json')

program
  .name('mfe-forge')
  .description('Production-ready Micro Frontend framework CLI')
  .version(pkg.version, '-v, --version', 'Display version number')
  .usage('<command> [options]')
  .configureOutput({
    outputError: (str, write) => write(chalk.red(str)),
  })

// Global error handling
program.exitOverride()

program.addCommand(initCommand)
program.addCommand(generateCommand)
program.addCommand(devCommand)
program.addCommand(buildCommand)
program.addCommand(testCommand)
program.addCommand(syncCommand)
program.addCommand(doctorCommand)
program.addCommand(configCommand)
program.addCommand(statusCommand)
program.addCommand(graphCommand)
program.addCommand(inspectCommand)
program.addCommand(depsCommand)
program.addCommand(checkCommand)
program.addCommand(migrateCommand)

// Subcommands inherit exitOverride only when it is set on them directly
for (const command of program.commands) command.exitOverride()

try {
  await program.parseAsync()
} catch (err: any) {
  if (err.code === 'commander.version' || err.code === 'commander.help' || err.code === 'commander.helpDisplayed') {
    process.exit(ExitCode.Ok)
  }
  if (err instanceof CliError) {
    console.error(chalk.red('\n❌ Error:'), err.message)
    process.exit(err.exitCode)
  }
  if (typeof err.code === 'string' && err.code.startsWith('commander.')) {
    // Commander already printed the usage error
    process.exit(ExitCode.UserError)
  }
  console.error(chalk.red('\n❌ Error:'), err.message || err)
  process.exit(ExitCode.UserError)
}
