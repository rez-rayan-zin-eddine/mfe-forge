import { Command } from 'commander'
import inquirer from 'inquirer'
import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs-extra'
import path from 'path'
import { execa } from 'execa'
import { copyTemplate } from '../utils/files.js'
import { execBinCommand, runScriptCommand } from '../utils/package-manager.js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pkg = require('../../package.json')

export const initCommand = new Command('init')
  .description('Initialize a new MFE Forge project')
  .argument('[name]', 'Project name')
  .option('-t, --template <template>', 'Project template', 'default')
  .option('-pm, --package-manager <pm>', 'Package manager', 'bun')
  .option('--skip-install', 'Skip dependency installation')
  .option('--skip-git', 'Skip git initialization')
  .action(async (name, options) => {
    const spinner = ora()

    try {
      if (!name) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Project name:',
            validate: (input) => input.length > 0 || 'Name is required',
          },
          {
            type: 'input',
            name: 'organization',
            message: 'NPM organization (optional, e.g. @acme):',
            default: '',
          },
          {
            type: 'list',
            name: 'packageManager',
            message: 'Package manager:',
            choices: ['bun', 'pnpm', 'npm'],
            default: 'bun',
          },
          {
            type: 'checkbox',
            name: 'features',
            message: 'Select features to enable:',
            choices: [
              { name: 'Design System (Storybook + Tokens)', value: 'designSystem', checked: true },
              { name: 'Testing (Vitest + Playwright)', value: 'testing', checked: true },
              { name: 'Docker Support', value: 'docker', checked: true },
              { name: 'GitHub Actions CI/CD', value: 'ci', checked: true },
              { name: 'TypeScript Strict Mode', value: 'strictTs', checked: true },
            ],
          },
        ])

        name = answers.name
        options.packageManager = answers.packageManager
        options.features = answers.features
        options.organization = answers.organization
      }

      const targetDir = path.resolve(process.cwd(), name)

      if (await fs.pathExists(targetDir)) {
        console.error(chalk.red(`Directory ${name} already exists`))
        process.exit(1)
      }

      spinner.start('Creating project structure...')

      await fs.ensureDir(targetDir)

      const features: string[] = options.features ?? []
      const templateVars = {
        name,
        organization: options.organization || '',
        packageManager: options.packageManager,
        mfeForgeVersion: pkg.version,
        strictTs:        features.includes('strictTs'),
        hasVitest:       features.includes('testing'),
        hasPlaywright:   features.includes('testing'),
        hasCI:           features.includes('ci'),
        hasDocker:       features.includes('docker'),
        hasDesignSystem: features.includes('designSystem'),
      }

      // Create directory skeleton
      for (const dir of ['apps', 'packages', 'tools']) {
        await fs.ensureDir(path.join(targetDir, dir))
      }
      if (features.includes('ci')) {
        await fs.ensureDir(path.join(targetDir, '.github/workflows'))
      }

      // Copy all stubs from init template
      await copyTemplate('init', targetDir, templateVars)

      // Conditionally remove CI workflow if not requested
      if (!features.includes('ci')) {
        await fs.remove(path.join(targetDir, '.github'))
      }

      spinner.succeed('Project structure created')

      if (!options.skipGit) {
        spinner.start('Initializing git repository...')
        await execa('git', ['init'], { cwd: targetDir })
        await fs.writeFile(path.join(targetDir, '.gitattributes'), '* text=auto eol=lf\n')
        spinner.succeed('Git repository initialized')
      }

      if (!options.skipInstall) {
        spinner.start(`Installing dependencies with ${options.packageManager}...`)
        await execa(options.packageManager, ['install'], {
          cwd: targetDir,
          stdio: 'pipe',
        })
        spinner.succeed('Dependencies installed')
      }

      console.log(chalk.green('\n✅ Project initialized successfully!'))
      console.log(chalk.cyan(`\nNext steps:`))
      console.log(`  cd ${name}`)
      if (options.skipInstall) console.log(`  ${options.packageManager} install`)
      console.log(`  ${execBinCommand(options.packageManager, 'mfe')} generate host ${name}/host`)
      console.log(`  ${execBinCommand(options.packageManager, 'mfe')} generate app ${name}/dashboard`)
      console.log(`  ${runScriptCommand(options.packageManager, 'dev')}\n`)
    } catch (error: any) {
      spinner.fail('Initialization failed')
      console.error(chalk.red(error.message))
      process.exit(1)
    }
  })
