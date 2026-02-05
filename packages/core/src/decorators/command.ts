import { Magek } from '../magek'
import { CommandFilterHooks, CommandInterface, CommandRoleAccess, Register } from '@magek/common'
import { getClassMetadata, getNonExposedFields } from './metadata'
import { ClassDecoratorContext } from './decorator-utils'
import { command } from '../dsl/command'

/**
 * Decorator to mark a class as a Magek Command.
 * Commands represent user intentions and trigger business logic.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * This decorator is a thin wrapper around the command() DSL function.
 * It extracts metadata from the decorated class and creates a handler
 * that instantiates the class for backwards compatibility.
 *
 * @param attributes - Role access control and filter hooks configuration
 * @returns A class decorator function
 */
export function Command(
  attributes: CommandRoleAccess & CommandFilterHooks
): <TCommand>(commandClass: CommandInterface<TCommand>, context: ClassDecoratorContext) => void {
  return (commandClass, context) => {
    // Pass context.metadata because Symbol.metadata isn't attached to class yet during decorator execution
    const classMetadata = getClassMetadata(commandClass, context.metadata)

    // Create a handler that wraps the class's static handle method
    // This creates an instance for backwards compatibility with existing code
    const handler = async (input: unknown, register: Register): Promise<unknown> => {
      // Create an instance from the input (mirroring old createInstance behavior)
      const instance = Object.assign(new (commandClass as any)(), input)
      return commandClass.handle(instance, register)
    }

    // Use the DSL to register the command
    command(commandClass.name, {
      authorize: attributes.authorize,
      before: attributes.before,
      properties: classMetadata.fields,
      methods: classMetadata.methods,
    }, handler)

    // Register non-exposed fields from context.metadata
    const nonExposedFields = getNonExposedFields(context.metadata)
    if (nonExposedFields.length > 0) {
      Magek.configureCurrentEnv((config): void => {
        config.nonExposedGraphQLMetadataKey[commandClass.name] = nonExposedFields
      })
    }
  }
}
