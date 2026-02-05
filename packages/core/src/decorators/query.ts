import { Magek } from '../magek'
import {
  CommandFilterHooks,
  QueryAuthorizer,
  QueryInterface,
  QueryMetadata,
  QueryRoleAccess,
} from '@magek/common'
import { getClassMetadata, getNonExposedFields } from './metadata'
import { MagekAuthorizer } from '@magek/common'
import { ClassDecoratorContext } from './decorator-utils'

/**
 * Decorator to mark a class as a Magek Query.
 * Queries represent read operations that don't modify state.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * @param attributes - Role access control and filter hooks configuration
 * @returns A class decorator function
 */
export function Query(
  attributes: QueryRoleAccess & CommandFilterHooks
): <TCommand>(queryClass: QueryInterface<TCommand>, context: ClassDecoratorContext) => void {
  return (queryClass, context) => {
    Magek.configureCurrentEnv((config): void => {
      // Pass context.metadata because Symbol.metadata isn't attached to class yet during decorator execution
      const metadata = getClassMetadata(queryClass, context.metadata)
      config.registry.registerQuery(queryClass.name, {
        class: queryClass,
        authorizer: MagekAuthorizer.build(attributes) as QueryAuthorizer,
        properties: metadata.fields,
        methods: metadata.methods,
        before: attributes.before ?? [],
      } as QueryMetadata)

      // Register non-exposed fields from context.metadata
      const nonExposedFields = getNonExposedFields(context.metadata)
      if (nonExposedFields.length > 0) {
        config.registry.registerNonExposedFields(queryClass.name, nonExposedFields)
      }
    })
  }
}
