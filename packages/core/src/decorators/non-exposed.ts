import { Magek } from '../magek'
import { AnyClass } from '@magek/common'
import { FieldDecoratorContext, MethodDecoratorContext } from './decorator-types'

type FieldOrMethodDecoratorContext = FieldDecoratorContext | MethodDecoratorContext

/**
 * Decorator to mark a field or method as non-exposed in GraphQL.
 *
 * Uses TC39 Stage 3 decorators.
 */
export function nonExposed(
  _value: undefined | Function,
  context: FieldOrMethodDecoratorContext
): void {
  const fieldName = String(context.name)

  if (context.addInitializer) {
    context.addInitializer(function (this: object) {
      const klass = (context.static ? this : this.constructor) as AnyClass
      const className = klass.name

      Magek.configureCurrentEnv((config): void => {
        const value: Array<string> = config.nonExposedGraphQLMetadataKey[className] || []
        config.nonExposedGraphQLMetadataKey[className] = [...value, fieldName]
      })
    })
  }
}

// Re-export with PascalCase alias for backward compatibility during migration
// TODO: Remove this alias after all usages have been updated to @nonExposed
export { nonExposed as NonExposed }
