import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { execa } from 'execa'
import { getProjectContext } from '../utils/config.js'
import { discoverApps, discoverHosts } from '../utils/discovery.js'

export const devCommand = new Command('dev')
  .description('Start development servers')
  .option('-s, --scope <scope>', 'Run only apps in scope')
  .option('-a, --app <app>', 'Run specific app')
  .option('-p, --parallel <n>', 'Max parallel processes', '10')
  .option('--host-only', 'Run only host applications')
  .option('--build-watch', 'Use build --watch + preview for MFEs (better HMR support)')
  .action(async (options) => {
    const spinner = ora()
    const context = getProjectContext()
    const pm = context.config.defaults.packageManager

    try {
      const allApps = discoverApps(context)
      const hosts = discoverHosts(context)

      let targets: string[] = []

      if (options.app) {
        const app = allApps.find(
          (a) => a.name === options.app || a.name.endsWith(`/${options.app}`)
        )
        if (!app) {
          console.error(chalk.red(`App "${options.app}" not found`))
          process.exit(1)
        }
        targets = [app.name]
      } else if (options.scope) {
        targets = allApps.filter((a) => a.scope === options.scope).map((a) => a.name)
        if (hosts.includes(`${options.scope}/host`)) {
          targets.push(`${options.scope}/host`)
        }
      } else if (options.hostOnly) {
        targets = hosts
      } else {
        targets = [...allApps.map((a) => a.name), ...hosts]
        // Remove duplicates (host is also an app)
        targets = [...new Set(targets)]
      }

      if (targets.length === 0) {
        console.log(chalk.yellow('No apps found to run'))
        process.exit(0)
      }

      console.log(chalk.cyan(`\n🚀 Starting ${targets.length} application(s)...\n`))

      // Use concurrently or similar for parallel execution
      const commands = targets.map((name) => {
        const scriptName = `dev:${name.replace(/\//g, ':')}`
        return `${pm} run ${scriptName}`
      })

      if (commands.length === 1) {
        const [cmd, ...args] = commands[0].split(' ')
        await execa(cmd, args, { stdio: 'inherit', cwd: context.rootDir })
      } else {
        // Use concurrently for parallel execution
        try {
          await execa(
            'npx',
            [
              '--yes',
              'concurrently',
              '--kill-others-on-fail',
              '--names', targets.join(','),
              '--prefix-colors', 'auto',
              ...commands,          // each command is ONE string element, not split
            ],
            { stdio: 'inherit', cwd: context.rootDir }
          )
        } catch {
          // Fallback: run sequentially with info
          for (const target of targets) {
            const scriptName = `dev:${target.replace(/\//g, ':')}`
            console.log(chalk.cyan(`\n▶ Starting ${target}...`))
            try {
              await execa(pm, ['run', scriptName], { stdio: 'inherit', cwd: context.rootDir })
            } catch {
              console.log(chalk.yellow(`⚠ ${target} exited`))
            }
          }
        }
      }
    } catch (error: any) {
      spinner.fail('Dev server failed')
      console.error(chalk.red(error.message))
      process.exit(1)
    }
  })
