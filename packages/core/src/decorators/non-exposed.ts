import { FieldDecoratorContext, MethodDecoratorContext } from './decorator-types'

type FieldOrMethodDecoratorContext = FieldDecoratorContext | MethodDecoratorContext

/** Symbol for storing non-exposed fields in decorator context.metadata */
export const NON_EXPOSED_SYMBOL = Symbol.for('magek:nonExposed')

/**
 * Decorator to mark a field or method as non-exposed in GraphQL.
 *
 * Uses TC39 Stage 3 decorators.
 * Non-exposed fields are stored in context.metadata and read by class decorators
 * (@Entity, @ReadModel, @Command, @Query) which register them to config.
 */
export function nonExposed(
  _value: undefined | Function,
  context: FieldOrMethodDecoratorContext
): void {
  const fieldName = String(context.name)

  // Store in context.metadata (becomes class[Symbol.metadata])
  if (context.metadata) {
    if (!context.metadata[NON_EXPOSED_SYMBOL]) {
      context.metadata[NON_EXPOSED_SYMBOL] = []
    }
    const nonExposedFields = context.metadata[NON_EXPOSED_SYMBOL] as string[]
    if (!nonExposedFields.includes(fieldName)) {
      nonExposedFields.push(fieldName)
    }
  }
}
