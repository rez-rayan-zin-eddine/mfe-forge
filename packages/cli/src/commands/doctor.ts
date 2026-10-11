import { Command } from 'commander'
import chalk from 'chalk'
import fs from 'fs-extra'
import path from 'path'
import { getProjectContext } from '../utils/config.js'
import { discoverApps } from '../utils/discovery.js'
import { ExitCode } from '../utils/exit.js'
import type { ProjectContext } from '../types/index.js'

export type CheckStatus = 'pass' | 'warn' | 'fail'

export interface DoctorCheck {
  id: string
  status: CheckStatus
  message: string
  hint?: string
}

export interface DoctorReport {
  ok: boolean
  summary: Record<CheckStatus, number>
  checks: DoctorCheck[]
}

/** Runs every diagnostic check against a project and returns structured results. */
export async function runDoctor(context: ProjectContext, nodeVersion = process.version): Promise<DoctorReport> {
  const checks: DoctorCheck[] = []

  // Node version
  const major = parseInt(nodeVersion.slice(1).split('.')[0])
  checks.push(
    major < 20
      ? { id: 'node-version', status: 'fail', message: `Node ${nodeVersion} is too old`, hint: 'Install Node.js 20 or newer' }
      : { id: 'node-version', status: 'pass', message: `Node ${nodeVersion}` }
  )

  // Package manager lockfile
  const pm = context.config.defaults.packageManager
  const lockFiles: Record<string, string[]> = {
    pnpm: ['pnpm-lock.yaml'],
    bun: ['bun.lock', 'bun.lockb'],
    npm: ['package-lock.json'],
  }
  const lockFound = (lockFiles[pm] ?? []).some((f) => fs.existsSync(path.join(context.rootDir, f)))
  checks.push(
    lockFound
      ? { id: 'lockfile', status: 'pass', message: `Lock file present for ${pm}` }
      : { id: 'lockfile', status: 'fail', message: `No lock file found for ${pm}`, hint: `Run \`${pm} install\`` }
  )

  // Port conflicts
  const apps = discoverApps(context)
  const ports = new Map<number, string>()
  const conflicts: string[] = []
  for (const app of apps) {
    const owner = ports.get(app.port)
    if (owner) conflicts.push(`${app.name} and ${owner} both use port ${app.port}`)
    else ports.set(app.port, app.name)
  }
  checks.push(
    conflicts.length
      ? { id: 'ports', status: 'fail', message: `Port conflicts: ${conflicts.join('; ')}`, hint: 'Change the port in one of the vite.config.ts files' }
      : { id: 'ports', status: 'pass', message: 'No port conflicts' }
  )

  // Host coverage
  const scopes = [...new Set(apps.map((a) => a.scope))]
  const missingHosts: string[] = []
  for (const scope of scopes) {
    if (!(await fs.pathExists(path.join(context.appsDir, scope, 'host')))) missingHosts.push(scope)
  }
  if (scopes.length > 0) {
    checks.push(
      missingHosts.length
        ? { id: 'hosts', status: 'fail', message: `Scopes without a host: ${missingHosts.join(', ')}`, hint: 'Run `mfe-forge generate host <scope>/host`' }
        : { id: 'hosts', status: 'pass', message: 'All scopes have hosts' }
    )
  }

  // Workspaces
  const rootPkgPath = path.join(context.rootDir, 'package.json')
  if (await fs.pathExists(rootPkgPath)) {
    const rootPkg = await fs.readJson(rootPkgPath)
    const hasWorkspaces = rootPkg.workspaces || rootPkg.bun?.workspaces
    checks.push(
      hasWorkspaces
        ? { id: 'workspaces', status: 'pass', message: 'Workspaces configured' }
        : { id: 'workspaces', status: 'fail', message: 'Root package.json missing workspaces configuration', hint: 'Add "workspaces": ["apps/*/*", "packages/*"]' }
    )
  } else {
    checks.push({ id: 'workspaces', status: 'warn', message: 'No root package.json found' })
  }

  const summary: Record<CheckStatus, number> = { pass: 0, warn: 0, fail: 0 }
  for (const check of checks) summary[check.status]++
  return { ok: summary.fail === 0, summary, checks }
}

const icons: Record<CheckStatus, string> = { pass: chalk.green('✔'), warn: chalk.yellow('⚠'), fail: chalk.red('✖') }

export const doctorCommand = new Command('doctor')
  .description('Diagnose common issues in the MFE project')
  .option('--json', 'Output JSON')
  .action(async (options: { json?: boolean }) => {
    const report = await runDoctor(getProjectContext())

    if (options.json) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(chalk.cyan('🔍 Running diagnostics...\n'))
      for (const check of report.checks) {
        console.log(`  ${icons[check.status]} ${check.message}`)
        if (check.hint && check.status !== 'pass') console.log(chalk.gray(`      ${check.hint}`))
      }
      const { pass, warn, fail } = report.summary
      console.log(`\n${pass} passed, ${warn} warnings, ${fail} failed`)
      if (report.ok) console.log(chalk.green('✅ All checks passed'))
    }

    if (!report.ok) process.exitCode = ExitCode.TaskFailed
  })
