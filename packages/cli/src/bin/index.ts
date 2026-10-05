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

try {
  // Register commands
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

  program.parse()
} catch (err: any) {
  if (err.code === 'commander.version') {
    console.log(chalk.cyan(`mfe-forge v${pkg.version}`))
    process.exit(0)
  }
  if (err.code === 'commander.help') {
    process.exit(0)
  }
  console.error(chalk.red('\n❌ Error:'), err.message || err)
  process.exit(1)
}
