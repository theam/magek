 
import { Magek } from '../magek'
import {
  CommandAuthorizer,
  CommandFilterHooks,
  CommandInterface,
  CommandRoleAccess,
} from '@magek/common'
import { getClassMetadata } from './metadata'
import { MagekAuthorizer } from '../authorizer'

/**
 * Annotation to tell Magek which classes are your entities
 * @param attributes
 * @constructor
 */
export function Command(
  attributes: CommandRoleAccess & CommandFilterHooks
): <TCommand>(commandClass: CommandInterface<TCommand>) => void {
  return (commandClass) => {
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

