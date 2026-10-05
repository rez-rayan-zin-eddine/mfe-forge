export interface RemoteDefinition { name: string; url: string; environment?: string }
export interface RemoteHealth { status: 'unknown' | 'loading' | 'ready' | 'failed'; attempts: number; error?: Error }

export class RemoteRegistry {
  private definitions = new Map<string, RemoteDefinition>()
  private health = new Map<string, RemoteHealth>()
  register(definition: RemoteDefinition): void { this.definitions.set(definition.name, definition); this.health.set(definition.name, { status: 'unknown', attempts: 0 }) }
  get(name: string): RemoteDefinition | undefined { return this.definitions.get(name) }
  setHealth(name: string, health: RemoteHealth): void { this.health.set(name, health) }
  getHealth(name: string): RemoteHealth { return this.health.get(name) ?? { status: 'unknown', attempts: 0 } }
  clear(name?: string): void { if (name) { this.definitions.delete(name); this.health.delete(name) } else { this.definitions.clear(); this.health.clear() } }
}

export const remoteRegistry = new RemoteRegistry()
