// Path helpers for NeDB session store databases
import * as path from 'path'

export function connectionsDatabase(): string {
  return internalPath('connections.json')
}

export function subscriptionsDatabase(): string {
  return internalPath('subscriptions.json')
}

function internalPath(filename: string): string {
  return path.normalize(path.join('.', '.magek', filename))
}