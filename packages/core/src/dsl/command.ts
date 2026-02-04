/**
 * Declarative DSL for Commands
 *
 * This module provides a functional API for defining commands without using decorators.
 * Commands defined via the DSL are registered in MagekConfig and work identically to
 * decorator-defined commands at runtime.
 */

import {
  Class,
  CommandAuthorizer,
  CommandBeforeFunction,
  CommandHandler,
  CommandMetadata,
  PropertyMetadata,
  RoleInterface,
} from '@magek/common'
import { Magek } from '../magek'
import { MagekAuthorizer } from '../authorizer'

/**
 * Options for defining a command via the DSL
 */
export interface CommandOptions {
  /**
   * Authorization configuration.
   * - 'all': Allow all users
   * - Array of role classes: Allow only users with these roles
   * - Function: Custom authorizer function
   */
  readonly authorize?: 'all' | Array<Class<RoleInterface>> | CommandAuthorizer

  /**
   * Pre-processing hooks that transform the input before the handler
   */
  readonly before?: Array<CommandBeforeFunction>

  /**
   * Property definitions for GraphQL schema generation
   */
  readonly properties: Array<PropertyMetadata>

  /**
   * Method metadata for GraphQL return type generation.
   * If not specified, the command returns void in GraphQL.
   */
  readonly methods?: Array<PropertyMetadata>
}

/**
 * Defines a command using the declarative DSL.
 *
 * @param name - The command name (must be unique)
 * @param options - Command configuration (authorization, hooks, properties)
 * @param handler - The handler function that processes the command
 * @returns The CommandMetadata that can be used to reference the command
 *
 * @example
 * ```typescript
 * const CreateProduct = command('CreateProduct', {
 *   authorize: 'all',
 *   properties: [
 *     { name: 'name', typeInfo: { ... }, dependencies: [] },
 *     { name: 'price', typeInfo: { ... }, dependencies: [] },
 *   ],
 * }, async (input, register) => {
 *   const id = UUID.generate()
 *   register.events({ type: 'ProductCreated', entityId: id, ...input })
 *   return id
 * })
 * ```
 */
export function command<TInput = unknown, TResult = unknown>(
  name: string,
  options: CommandOptions,
  handler: CommandHandler<TInput, TResult>
): CommandMetadata<TInput, TResult> {
  // Build the authorizer using the same logic as decorators
  const authorizer = MagekAuthorizer.build({ authorize: options.authorize }) as CommandAuthorizer

  // Create the command metadata
  const metadata: CommandMetadata<TInput, TResult> = {
    name,
    properties: options.properties,
    handler,
    authorizer,
    before: options.before ?? [],
    methods: options.methods ?? [],
  }

  // Register in MagekConfig
  Magek.configureCurrentEnv((config): void => {
    if (config.commandHandlers[name]) {
      throw new Error(
        `A command called ${name} is already registered. ` +
          'If you think that this is an error, try performing a clean build.'
      )
    }

    // Cast to the registry type (generic variance)
    config.commandHandlers[name] = metadata as CommandMetadata<unknown, unknown>
  })

  return metadata
}
