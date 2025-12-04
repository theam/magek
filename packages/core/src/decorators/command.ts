import { Magek } from '../magek'
import {
  CommandAuthorizer,
  CommandFilterHooks,
  CommandInterface,
  CommandRoleAccess,
} from '@magek/common'
import { getClassMetadata } from './metadata'
import { MagekAuthorizer } from '../authorizer'
import { transferStage3FieldMetadata } from './stage3-utils'

/**
 * Stage 3 class decorator context
 */
interface Stage3ClassContext {
  kind: 'class'
  name: string | undefined
  metadata: Record<string | symbol, unknown>
  addInitializer?: (initializer: () => void) => void
}

/**
 * Type guard to detect Stage 3 class decorator context
 */
function isStage3ClassContext(arg: unknown): arg is Stage3ClassContext {
  return (
    arg !== null &&
    typeof arg === 'object' &&
    'kind' in arg &&
    (arg as Stage3ClassContext).kind === 'class' &&
    'metadata' in arg
  )
}

/**
 * Annotation to tell Magek which classes are your entities
 * @param attributes
 * @constructor
 */
export function Command(
  attributes: CommandRoleAccess & CommandFilterHooks
): <TCommand>(commandClass: CommandInterface<TCommand>, context?: Stage3ClassContext) => void {
  return (commandClass, context?) => {
    // Transfer Stage 3 field metadata if applicable
    if (isStage3ClassContext(context)) {
      transferStage3FieldMetadata(commandClass, context.metadata)
    }

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

