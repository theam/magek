import { Magek } from '../magek'
import { AnyClass } from '@magek/common'

/**
 * Stage 3 field decorator context
 */
interface Stage3FieldContext {
  kind: 'field'
  name: string | symbol
  static: boolean
  private: boolean
  metadata?: Record<string | symbol, unknown>
  addInitializer?: (initializer: () => void) => void
}

/**
 * Stage 3 method decorator context
 */
interface Stage3MethodContext {
  kind: 'method'
  name: string | symbol
  static: boolean
  private: boolean
  metadata?: Record<string | symbol, unknown>
  addInitializer?: (initializer: () => void) => void
}

type Stage3FieldOrMethodContext = Stage3FieldContext | Stage3MethodContext

/**
 * Decorator to mark a field or method as non-exposed in GraphQL.
 *
 * Uses TC39 Stage 3 decorators.
 */
export function nonExposed(
  _value: undefined | Function,
  context: Stage3FieldOrMethodContext
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
