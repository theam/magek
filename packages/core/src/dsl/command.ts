/**
 * Declarative DSL for Commands
 *
 * This module provides a functional API for defining commands without using decorators.
 * Commands defined via the DSL are registered in the MagekRegistry and work identically
 * to decorator-defined commands at runtime.
 */

import {
  CommandHandler,
  CommandMetadata,
  CommandOptions,
} from '@magek/common'
import { Magek } from '../magek'

// Re-export CommandOptions from common so existing consumers don't break
export type { CommandOptions } from '@magek/common'

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
  return Magek.config.registry.command(name, options, handler)
}
