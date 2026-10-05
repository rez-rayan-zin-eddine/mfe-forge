import { Command } from 'commander'
import chalk from 'chalk'
import fs from 'fs-extra'
import path from 'path'
import { getProjectContext } from '../utils/config.js'
import { discoverApps, discoverHosts } from '../utils/discovery.js'
import { createManifest, loadManifest, validateManifest, writeManifest } from '../utils/manifest.js'

function print(value: unknown, json?: boolean): void { if (json) console.log(JSON.stringify(value, null, 2)); else console.log(value) }

export const statusCommand = new Command('status').description('Show project topology').option('--json', 'Output JSON').action(async ({ json }) => {
  const context=getProjectContext(); const manifest=await writeManifest(context)
  print({ project: context.config.name, apps: manifest.apps.length, hosts: manifest.hosts, packages: manifest.packages.length, manifest: 'mfe-forge.manifest.json' }, json)
  if (!json) for (const app of manifest.apps) console.log(`${app.name} :${app.port} ${app.name.endsWith('/host') ? '(host)' : '(remote)'}`)
})

export const graphCommand = new Command('graph').description('Show host, remote, and package relationships').option('--format <format>', 'text or json', 'text').action(async ({ format }) => {
  const context=getProjectContext(); const apps=discoverApps(context); const graph=discoverHosts(context).map(host=>({ host, remotes: apps.filter(app=>app.scope===host.split('/')[0] && app.name!==host).map(app=>({ name: app.name, federationName: app.federationName, url: app.url, packages: [app.packageName] })) }))
  print({ nodes: apps, edges: graph }, format==='json')
  if (format!=='json') for (const item of graph) console.log(`${item.host} -> ${item.remotes.map(remote=>remote.name).join(', ') || '(none)'}`)
})

export const inspectCommand = new Command('inspect').description('Inspect an application').argument('<app>').option('--json', 'Output JSON').action(async (name, { json }) => {
  const app=discoverApps(getProjectContext()).find(item=>item.name===name || item.name.endsWith(`/${name}`))
  if (!app) { console.error(chalk.red(`App not found: ${name}`)); process.exitCode=1; return }
  print(app, json)
})

export const depsCommand = new Command('deps').description('Inspect dependency and shared configuration').option('--check').option('--shared').option('--json').action(async ({ check, shared: sharedOnly, json }) => {
  const context=getProjectContext(); const manifest=loadManifest(context) ?? createManifest(context); const entries=manifest.packages.flatMap(pkg=>Object.entries(pkg.dependencies).map(([name, version])=>({ package: pkg.name, name, version })))
  const shared=context.config.federation.shared; const mismatches=shared.filter(name=>new Set(entries.filter(entry=>entry.name===name).map(entry=>entry.version)).size>1)
  const result={ shared, dependencies: entries, mismatches, valid: mismatches.length===0 }
  print(sharedOnly ? { shared, mismatches } : result, json)
  if (check && mismatches.length) process.exitCode=1
})

export const checkCommand = new Command('check').description('Validate project configuration and topology').option('--json').action(async ({ json }) => {
  const context=getProjectContext(); const manifest=loadManifest(context) ?? createManifest(context); const errors=[...validateManifest(manifest)]; const ports=new Map<number,string>(); for (const app of manifest.apps) { if (ports.has(app.port)) errors.push(`Port ${app.port} is used by ${ports.get(app.port)} and ${app.name}`); else ports.set(app.port, app.name) }
  const result={ valid: errors.length===0, errors }; print(result, json); if (errors.length) process.exitCode=1
})

export const migrateCommand = new Command('migrate').description('Inspect or apply project migrations').option('--check').option('--json').action(async ({ check, json }) => {
  const context=getProjectContext(); const file=path.join(context.rootDir, 'mfe-forge.manifest.json'); const result={ migrations: [], pending: !fs.existsSync(file) ? ['manifest-v1'] : [] }; print(result, json); if (check && result.pending.length) process.exitCode=1; else if (result.pending.length) await writeManifest(context)
})
