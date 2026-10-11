import { Command } from 'commander'
import path from 'path'
import { execa } from 'execa'
import { getProjectContext } from '../utils/config.js'
import { discoverApps, resolveApp } from '../utils/discovery.js'
import { CliError, ExitCode } from '../utils/exit.js'

export const testCommand = new Command('test')
  .description('Run tests across MFEs')
  .option('-u, --unit', 'Run the `test:unit` script instead of `test`')
  .option('-e, --e2e', 'Run the `test:e2e` script instead of `test`')
  .option('-c, --coverage', 'Generate coverage report')
  .option('-w, --watch', 'Watch mode')
  .argument('[app]', 'Specific app to test (scope/name or unambiguous name)')
  .action(async (app: string | undefined, options) => {
    const context = getProjectContext()
    const pm = context.config.defaults.packageManager

    if (options.unit && options.e2e) throw new CliError('Use either --unit or --e2e, not both', ExitCode.UserError)
    // --unit/--e2e select a script; only runner flags are forwarded to it
    const script = options.unit ? 'test:unit' : options.e2e ? 'test:e2e' : 'test'
    const args: string[] = []
    if (options.coverage) args.push('--coverage')
    if (options.watch) args.push('--watch')

    let cwd = context.rootDir
    if (app) {
      const match = resolveApp(discoverApps(context), app)
      if (!match) throw new CliError(`App "${app}" not found`, ExitCode.UserError)
      cwd = path.join(context.appsDir, match.name)
    }

    try {
      await execa(pm, ['run', script, ...(args.length ? ['--', ...args] : [])], { cwd, stdio: 'inherit' })
    } catch {
      throw new CliError('Tests failed', ExitCode.TaskFailed)
    }
  })
