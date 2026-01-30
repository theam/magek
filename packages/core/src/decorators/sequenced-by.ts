import { FieldDecoratorContext } from './decorator-types'

/** Symbol for storing sequence key in decorator context.metadata */
export const SEQUENCE_KEY_SYMBOL = Symbol.for('magek:sequenceKey')

/**
 * Decorator to specify the sequencing key for a ReadModel.
 *
 * Uses TC39 Stage 3 decorators.
 * The sequence key is stored in context.metadata and read by @ReadModel.
 */
export function sequencedBy(
  _value: undefined,
  context: FieldDecoratorContext
): void {
  const propertyName = String(context.name)

  // Store the sequence key in context.metadata for ReadModel decorator to pick up
  if (context.metadata) {
    context.metadata[SEQUENCE_KEY_SYMBOL] = propertyName
  }
}
