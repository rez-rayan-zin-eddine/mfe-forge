import { Command } from 'commander'
import chalk from 'chalk'
import { execa } from 'execa'
import { getProjectContext } from '../utils/config.js'

export const testCommand = new Command('test')
  .description('Run tests across MFEs')
  .option('-u, --unit', 'Run unit tests only')
  .option('-e, --e2e', 'Run E2E tests only')
  .option('-c, --coverage', 'Generate coverage report')
  .option('-w, --watch', 'Watch mode')
  .argument('[app]', 'Specific app to test')
  .action(async (app, options) => {
    const context = getProjectContext()
    const pm = context.config.defaults.packageManager

    try {
      const args: string[] = []

      if (options.unit) args.push('--unit')
      if (options.e2e) args.push('--e2e')
      if (options.coverage) args.push('--coverage')
      if (options.watch) args.push('--watch')

      if (app) {
        const appDir = `${context.rootDir}/apps/${app}`
        await execa(pm, ['run', 'test', ...args], {
          cwd: appDir,
          stdio: 'inherit',
        })
      } else {
        // Run all tests via turbo
        await execa(pm, ['run', 'test', ...args], {
          cwd: context.rootDir,
          stdio: 'inherit',
        })
      }
    } catch {
      console.error(chalk.red('Tests failed'))
      process.exit(1)
    }
  })
