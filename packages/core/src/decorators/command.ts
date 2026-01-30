import { Magek } from '../magek'
import {
  CommandAuthorizer,
  CommandFilterHooks,
  CommandInterface,
  CommandRoleAccess,
} from '@magek/common'
import { getClassMetadata } from './metadata'
import { MagekAuthorizer } from '../authorizer'
import { ClassDecoratorContext } from './decorator-utils'

/**
 * Decorator to mark a class as a Magek Command.
 * Commands represent user intentions and trigger business logic.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * @param attributes - Role access control and filter hooks configuration
 * @returns A class decorator function
 */
export function Command(
  attributes: CommandRoleAccess & CommandFilterHooks
): <TCommand>(commandClass: CommandInterface<TCommand>, context: ClassDecoratorContext) => void {
  return (commandClass, context) => {
    Magek.configureCurrentEnv((config): void => {
      if (config.commandHandlers[commandClass.name]) {
        throw new Error(`A command called ${commandClass.name} is already registered.
        If you think that this is an error, try performing a clean build.`)
      }

      // Pass context.metadata because Symbol.metadata isn't attached to class yet during decorator execution
      const metadata = getClassMetadata(commandClass, context.metadata)
      config.commandHandlers[commandClass.name] = {
        class: commandClass,
        authorizer: MagekAuthorizer.build(attributes) as CommandAuthorizer,
        before: attributes.before ?? [],
        properties: metadata.fields,
        methods: metadata.methods,
      }
    })
  }
}
