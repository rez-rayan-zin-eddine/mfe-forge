export type PackageManager = 'bun' | 'pnpm' | 'npm' | (string & {})

/** Command that runs `script` in a single workspace package. */
export function workspaceRunCommand(pm: PackageManager, packageName: string, script: string): string {
  if (pm === 'npm') return `npm run ${script} --workspace=${packageName}`
  return `${pm} --filter ${packageName} ${script}`
}

/** Command that runs a root `package.json` script. */
export function runScriptCommand(pm: PackageManager, script: string): string {
  return `${pm} run ${script}`
}

/** Command that executes a locally installed binary. */
export function execBinCommand(pm: PackageManager, bin: string): string {
  if (pm === 'npm') return `npx ${bin}`
  if (pm === 'bun') return `bunx ${bin}`
  return `${pm} exec ${bin}`
}
