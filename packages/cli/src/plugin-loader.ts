import type { Command, Config, Interfaces } from '@oclif/core'
import type { Injectable } from '@magek/core'
import { readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const adapterPrefix = 'adapter-'

type MagekCliModule = {
  magekCli?: Injectable.Injectable
  default?: {
    magekCli?: Injectable.Injectable
  }
}

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error

const discoverAdapterPackages = async (projectRoot: string): Promise<Array<string>> => {
  const scopeDir = join(projectRoot, 'node_modules', '@magek')
  try {
    const entries = await readdir(scopeDir, { withFileTypes: true })
    return entries
      .filter((entry) => (entry.isDirectory() || entry.isSymbolicLink()) && entry.name.startsWith(adapterPrefix))
      .map((entry) => `@magek/${entry.name}`)
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return []
    }
    throw error
  }
}

const loadMagekCliModule = async (projectRoot: string, packageName: string): Promise<MagekCliModule> => {
  const projectRequire = createRequire(join(projectRoot, 'package.json'))
  try {
    return projectRequire(packageName) as MagekCliModule
  } catch (error) {
    if (isNodeError(error) && error.code === 'ERR_REQUIRE_ESM') {
      const resolved = projectRequire.resolve(packageName)
      const module = await import(pathToFileURL(resolved).href)
      return module as MagekCliModule
    }
    throw error
  }
}

const resolveMagekCli = (module: MagekCliModule): Injectable.Injectable | null => {
  const magekCli = module.magekCli ?? module.default?.magekCli
  if (!magekCli || typeof magekCli !== 'object') {
    return null
  }
  return magekCli
}

const normalizeArgs = (
  args: Record<string, Command.Arg.Any> | Array<Command.Arg.Any> | undefined
): Record<string, Command.Arg.Any> => {
  if (!args) {
    return {}
  }
  if (Array.isArray(args)) {
    return Object.fromEntries(args.map((arg) => [arg.name, arg]))
  }
  return args
}

type MagekCommandClass = Command.Class & Injectable.Command

const isCommandClass = (command: unknown): command is MagekCommandClass =>
  typeof command === 'function' && typeof (command as Command.Class).run === 'function'

const buildLoadableCommands = (
  commands: Record<string, Injectable.Command>,
  pluginName: string
): Array<Command.Loadable> => {
  const commandEntries = Object.entries(commands)
  return commandEntries.flatMap(([commandId, command]) => {
    if (!isCommandClass(command)) {
      return []
    }
    const commandClass = command
    commandClass.id ??= commandId
    const legacyExample = (commandClass as { example?: Command.Example[] }).example
    return [
      {
        aliases: (commandClass.aliases ?? []).map((alias) => alias.split(' ').join(':')),
        args: normalizeArgs(commandClass.args) as Command.Cached['args'],
        deprecateAliases: commandClass.deprecateAliases,
        deprecationOptions: commandClass.deprecationOptions,
        description: commandClass.description,
        examples: commandClass.examples ?? legacyExample,
        flags: (commandClass.flags ?? {}) as Command.Cached['flags'],
        hasDynamicHelp: commandClass.hasDynamicHelp ?? false,
        hidden: commandClass.hidden ?? false,
        hiddenAliases: commandClass.hiddenAliases ?? [],
        id: commandClass.id,
        pluginAlias: pluginName,
        pluginName,
        pluginType: 'user',
        state: commandClass.state,
        strict: commandClass.strict,
        summary: commandClass.summary,
        usage: commandClass.usage,
        load: async () => commandClass,
      },
    ]
  })
}

type OclifPlugin = Interfaces.Plugin

const createPlugin = (config: Config, packageName: string, commands: Array<Command.Loadable>): OclifPlugin => {
  const findCommand = (async (id: string, opts?: { must: boolean }) => {
    const command = commands.find((commandEntry) => commandEntry.id === id)
    const commandClass = command ? await command.load() : undefined
    if (!commandClass && opts?.must) {
      throw new Error(`command ${id} not found`)
    }
    return commandClass
  }) as OclifPlugin['findCommand']
  const pjson = { name: packageName, version: '0.0.0', oclif: {} } as Interfaces.PJSON
  return {
  _base: '',
  alias: packageName,
  commandIDs: commands.map((command) => command.id),
  commands,
  commandsDir: undefined,
  findCommand,
  hasManifest: false,
  hooks: {},
  isRoot: false,
  load: async () => {},
  moduleType: 'commonjs',
  name: packageName,
  options: config.options,
  parent: undefined,
  pjson,
  root: config.root,
  tag: undefined,
  topics: [],
  type: 'user',
  valid: true,
  version: '0.0.0',
  }
}

export const registerMagekCliPlugins = async (config: Config, projectRoot = process.cwd()): Promise<void> => {
  const adapterPackages = await discoverAdapterPackages(projectRoot)
  if (adapterPackages.length === 0) {
    return
  }
  // @oclif/core does not expose a public API for registering runtime commands.
  const registerPlugin = (plugin: OclifPlugin): void => {
    const configLoader = config as unknown as {
      loadCommands?: (plugin: OclifPlugin) => void
      loadTopics?: (plugin: OclifPlugin) => void
    }
    if (!configLoader.loadCommands || !configLoader.loadTopics) {
      console.warn('Unable to register Magek CLI plugins with this oclif version.')
      return
    }
    configLoader.loadCommands(plugin)
    configLoader.loadTopics(plugin)
  }
  for (const packageName of adapterPackages) {
    try {
      const module = await loadMagekCliModule(projectRoot, packageName)
      const magekCli = resolveMagekCli(module)
      if (!magekCli?.commands || Object.keys(magekCli.commands).length === 0) {
        continue
      }
      const loadableCommands = buildLoadableCommands(magekCli.commands, packageName)
      if (loadableCommands.length === 0) {
        continue
      }
      const plugin = createPlugin(config, packageName, loadableCommands)
      registerPlugin(plugin)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn(`Skipping Magek CLI plugin ${packageName}: ${errorMessage}`)
    }
  }
}
