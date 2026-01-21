/**
 * Example format for CLI command help.
 */
export type CLICommandExample = string | { command: string; description: string }

/**
 * Interface for a CLI command class constructor.
 * Compatible with oclif Command but defined without oclif dependency.
 *
 * @template TArgs - Type for the command arguments definition
 * @template TFlags - Type for the command flags definition
 * @template TConfig - Type for the CLI configuration object
 */
export interface CLIPluginCommand<
  TArgs extends Record<string, object> = Record<string, object>,
  TFlags extends Record<string, object> = Record<string, object>,
  TConfig = object,
> {
  // Constructor signature
  new (argv: string[], config: TConfig): { run(): Promise<unknown> }

  // Static properties used by the CLI plugin loader
  id?: string
  aliases?: string[]
  args?: TArgs
  flags?: TFlags
  description?: string
  summary?: string
  examples?: CLICommandExample[]
  hidden?: boolean
  hiddenAliases?: string[]
  deprecateAliases?: boolean
  deprecationOptions?: { message?: string; version?: string }
  state?: string
  strict?: boolean
  usage?: string | string[]
  hasDynamicHelp?: boolean

  // Static run method
  run(argv?: string[], config?: TConfig): Promise<unknown>
}

/**
 * Interface for adapter packages to expose CLI commands.
 * Adapters export this as `magekCli` and the CLI discovers/loads them at runtime.
 */
export interface CLIPlugin {
  /**
   * Map of command IDs to CLI command classes.
   */
  commands: Record<string, CLIPluginCommand>
}
