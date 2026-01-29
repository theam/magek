import { Magek } from '../magek'
import {
  CommandAuthorizer,
  CommandFilterHooks,
  CommandInterface,
  CommandRoleAccess,
} from '@magek/common'
import { getClassMetadata } from './metadata'
import { MagekAuthorizer } from '../authorizer'
import { transferStage3FieldMetadata, Stage3ClassContext } from './stage3-utils'

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
): <TCommand>(commandClass: CommandInterface<TCommand>, context: Stage3ClassContext) => void {
  return (commandClass, context) => {
    // Transfer Stage 3 field metadata
    transferStage3FieldMetadata(commandClass, context.metadata)

    Magek.configureCurrentEnv((config): void => {
      if (config.commandHandlers[commandClass.name]) {
        throw new Error(`A command called ${commandClass.name} is already registered.
        If you think that this is an error, try performing a clean build.`)
      }

      const metadata = getClassMetadata(commandClass)
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
