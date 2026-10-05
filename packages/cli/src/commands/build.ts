import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { execa } from 'execa'
import path from 'path'
import { getProjectContext } from '../utils/config.js'
import { discoverApps } from '../utils/discovery.js'

export const buildCommand = new Command('build')
  .description('Build applications for production')
  .argument('[app]', 'Specific app to build')
  .option('-s, --scope <scope>', 'Build all apps in scope')
  .option('--analyze', 'Analyze bundle size')
  .option('--parallel', 'Build in parallel', true)
  .action(async (app, options) => {
    const spinner = ora()
    const context = getProjectContext()
    const pm = context.config.defaults.packageManager

    try {
      const allApps = discoverApps(context)
      let targets: string[] = []

      // Normalize bare app names to scope/name format
      const normalizeAppName = (name: string) => {
        if (name.includes('/')) return name
        const match = allApps.find(a => a.name.endsWith(`/${name}`))
        return match?.name ?? name
      }

      if (app) {
        targets = [normalizeAppName(app)]
      } else if (options.scope) {
        targets = allApps.filter((a) => a.scope === options.scope).map((a) => a.name)
      } else {
        targets = allApps.map((a) => a.name)
      }

      console.log(chalk.cyan(`\n🔨 Building ${targets.length} application(s)...\n`))

      for (const target of targets) {
        const appInfo = allApps.find((a) => a.name === target)
        if (!appInfo) {
          console.log(chalk.yellow(`⚠ App "${target}" not found, skipping`))
          continue
        }

        spinner.start(`Building ${target}...`)

        try {
          const appDir = path.join(context.appsDir, target)
          await execa(pm, ['run', 'build'], {
            cwd: appDir,
            stdio: 'pipe',
          })
          spinner.succeed(`Built ${target}`)
        } catch (error: any) {
          spinner.fail(`Failed to build ${target}`)
          console.error(chalk.red(error.stderr || error.message))
        }
      }

      console.log(chalk.green('\n✅ Build complete'))
    } catch (error: any) {
      spinner.fail('Build failed')
      console.error(chalk.red(error.message))
      process.exit(1)
    }
  })
