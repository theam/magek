 
import { Magek } from '../magek'
import {
  CommandFilterHooks,
  QueryAuthorizer,
  QueryInterface,
  QueryMetadata,
  QueryRoleAccess,
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
 * Decorator to mark a class as a Magek Query.
 * Queries represent read operations that don't modify state.
 *
 * Supports both legacy decorators (experimentalDecorators) and
 * Stage 3 TC39 decorators.
 *
 * @param attributes - Role access control and filter hooks configuration
 * @returns A class decorator function
 */
export function Query(
  attributes: QueryRoleAccess & CommandFilterHooks
): <TCommand>(queryClass: QueryInterface<TCommand>, context?: Stage3ClassContext) => void {
  return (queryClass, context?) => {
    // Transfer Stage 3 field metadata if applicable
    if (isStage3ClassContext(context)) {
      transferStage3FieldMetadata(queryClass, context.metadata)
    }

    Magek.configureCurrentEnv((config): void => {
      if (config.queryHandlers[queryClass.name]) {
        throw new Error(`A query called ${queryClass.name} is already registered.
        If you think that this is an error, try performing a clean build.`)
      }

      const metadata = getClassMetadata(queryClass)
      config.queryHandlers[queryClass.name] = {
        class: queryClass,
        authorizer: MagekAuthorizer.build(attributes) as QueryAuthorizer,
        properties: metadata.fields,
        methods: metadata.methods,
        before: attributes.before ?? [],
      } as QueryMetadata
    })
  }
}
