import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { execa } from 'execa'
import path from 'path'
import { getProjectContext } from '../utils/config.js'
import { discoverApps, resolveApp } from '../utils/discovery.js'
import { CliError, ExitCode } from '../utils/exit.js'

export const buildCommand = new Command('build')
  .description('Build applications for production')
  .argument('[app]', 'Specific app to build (scope/name or unambiguous name)')
  .option('-s, --scope <scope>', 'Build all apps in scope')
  .option('--analyze', 'Analyze bundle size')
  .option('--bail', 'Stop at the first failed build')
  .option('--parallel', 'Accepted for compatibility; builds currently run sequentially')
  .action(async (app: string | undefined, options: { scope?: string; bail?: boolean }) => {
    const spinner = ora()
    const context = getProjectContext()
    const pm = context.config.defaults.packageManager
    const allApps = discoverApps(context)

    let targets = allApps
    if (app) {
      const match = resolveApp(allApps, app)
      if (!match) throw new CliError(`App "${app}" not found`, ExitCode.UserError)
      targets = [match]
    } else if (options.scope) {
      targets = allApps.filter((a) => a.scope === options.scope)
      if (targets.length === 0) throw new CliError(`No apps found in scope "${options.scope}"`, ExitCode.UserError)
    }

    console.log(chalk.cyan(`\n🔨 Building ${targets.length} application(s)...\n`))

    const built: string[] = []
    const failed: string[] = []

    for (const target of targets) {
      spinner.start(`Building ${target.name}...`)
      try {
        await execa(pm, ['run', 'build'], {
          cwd: path.join(context.appsDir, target.name),
          stdio: 'pipe',
        })
        spinner.succeed(`Built ${target.name}`)
        built.push(target.name)
      } catch (error: any) {
        spinner.fail(`Failed to build ${target.name}`)
        console.error(chalk.red(error.stderr || error.message))
        failed.push(target.name)
        if (options.bail) break
      }
    }

    const skipped = targets.length - built.length - failed.length
    const summary = [`✔ built ${built.length}`, `✖ failed ${failed.length}`]
    if (skipped > 0) summary.push(`○ skipped ${skipped}`)
    console.log(`\n${summary.join(', ')}`)

    if (failed.length > 0) {
      throw new CliError(`Build failed for: ${failed.join(', ')}`, ExitCode.TaskFailed)
    }
    console.log(chalk.green('✅ Build complete'))
  })
