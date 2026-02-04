import { Class } from '../typelevel'
import { PropertyMetadata } from '../metadata-types'
import { Register, CommandAuthorizer, CommandFilterHooks } from './.'

export type CommandInput = Record<string, any>

/**
 * Handler function type for commands.
 * Receives the command input and a Register instance to emit events.
 */
export type CommandHandler<TInput = unknown, TResult = unknown> = (
  input: TInput,
  register: Register
) => Promise<TResult>

/**
 * Command metadata stored in MagekConfig.
 * Uses handler functions instead of class references.
 */
export interface CommandMetadata<TInput = unknown, TResult = unknown> {
  /** The command name (used as the key in the registry) */
  readonly name: string

  /** Property metadata for GraphQL schema generation */
  readonly properties: Array<PropertyMetadata>

  /** The handler function that processes the command */
  readonly handler: CommandHandler<TInput, TResult>

  /** Authorization function */
  readonly authorizer: CommandAuthorizer

  /** Pre-processing hooks */
  readonly before: NonNullable<CommandFilterHooks['before']>

  /**
   * Method metadata for GraphQL return type generation.
   * For decorator-based commands, this contains the return type from @returns decorator.
   * For DSL-based commands, this can be set via the returnType option.
   */
  readonly methods: Array<PropertyMetadata>
}

/**
 * @deprecated Use CommandHandler and command() DSL function instead.
 * This interface is kept for backwards compatibility with the @Command decorator
 * during the migration period.
 */
export interface CommandInterface<TCommand = unknown, THandleResult = unknown> extends Class<TCommand> {
  handle(command: TCommand, register: Register): Promise<THandleResult>
}
