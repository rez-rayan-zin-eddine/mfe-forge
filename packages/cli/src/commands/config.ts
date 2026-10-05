import { Command } from 'commander'
import chalk from 'chalk'
import path from 'path'
import inquirer from 'inquirer'
import { getProjectContext, saveConfig, getConfigValue, setConfigValue, validateConfig } from '../utils/config.js'

export const configCommand = new Command('config')
  .description('Manage MFE Forge configuration')
  .option('--get <key>', 'Get config value')
  .option('--set <key>', 'Set config value')
  .option('--value <value>', 'Value to set')
  .option('--edit', 'Open config in editor')
  .option('--validate', 'Validate configuration')
  .option('--show', 'Show the complete configuration')
  .option('--json', 'Output JSON')
  .action(async (options) => {
    const context = getProjectContext()
    const configPath = path.join(context.rootDir, 'mfeforge.config.ts')

    if (options.validate) {
      const errors = validateConfig(context.config)
      if (options.json) console.log(JSON.stringify({ valid: errors.length === 0, errors }, null, 2))
      else console.log(errors.length ? chalk.red(errors.join('\n')) : chalk.green('Configuration is valid'))
      if (errors.length) process.exitCode = 1
      return
    }

    if (options.show) {
      console.log(options.json ? JSON.stringify(context.config, null, 2) : JSON.stringify(context.config, null, 2))
      return
    }

    if (options.get) {
      const value = getConfigValue(context.config, options.get)
      console.log(options.json ? JSON.stringify({ key: options.get, value }, null, 2) : value !== undefined ? String(value) : chalk.gray('undefined'))
      return
    }

    if (options.set) {
      if (options.value === undefined) {
        console.error(chalk.red('--value is required with --set'))
        process.exit(1)
      }
      let value: unknown = options.value
      try { value = JSON.parse(options.value) } catch { /* keep string */ }
      const updated = setConfigValue(context.config, options.set, value)
      await saveConfig(updated, context.rootDir)
      if (options.json) console.log(JSON.stringify({ key: options.set, value }, null, 2))
      else console.log(chalk.green(`Updated ${options.set}`))
      return
    }

    if (options.edit) {
      const { default: open } = await import('open')
      await open(configPath)
      return
    }

    // Interactive config
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'packageManager',
        message: 'Default package manager:',
        choices: ['bun', 'pnpm', 'npm'],
        default: context.config.defaults.packageManager,
      },
      {
        type: 'confirm',
        name: 'autoStartHost',
        message: 'Auto-start host with apps?',
        default: context.config.dev.autoStartHost,
      },
    ])

    const newConfig = {
      ...context.config,
      defaults: { ...context.config.defaults, ...answers },
      dev: { ...context.config.dev, autoStartHost: answers.autoStartHost },
    }

    await saveConfig(newConfig, context.rootDir)
    console.log(chalk.green('Configuration updated'))
  })
