import { Magek } from '../magek'
import { AnyClass } from '@magek/common'
import { FieldDecoratorContext, DecoratorMetadataObject } from './decorator-types'

// Symbol for storing sequence key in decorator context.metadata
const SEQUENCE_KEY_SYMBOL = Symbol.for('magek:sequenceKey')

/**
 * Register sequence key for a class
 */
function registerSequenceKey(klass: AnyClass, propertyName: string): void {
  Magek.configureCurrentEnv((config): void => {
    if (config.readModelSequenceKeys[klass.name] && config.readModelSequenceKeys[klass.name] !== propertyName) {
      throw new Error(
        `Error trying to register a sort key named \`${propertyName}\` for class \`${
          klass.name
        }\`. It already had the sort key \`${
          config.readModelSequenceKeys[klass.name]
        }\` defined and only one sort key is allowed for each read model.`
      )
    } else {
      config.readModelSequenceKeys[klass.name] = propertyName
    }
  })
}

/**
 * Decorator to specify the sequencing key for a ReadModel.
 *
 * Uses TC39 Stage 3 decorators.
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

  // Also use addInitializer to register immediately when class is defined
  if (context.addInitializer) {
    context.addInitializer(function (this: object) {
      const klass = this.constructor as AnyClass
      registerSequenceKey(klass, propertyName)
    })
  }
}

/**
 * Transfer sequence key metadata from decorator context to class.
 * Called by the ReadModel class decorator.
 */
export function transferSequenceKeyMetadata(
  classType: AnyClass,
  contextMetadata?: DecoratorMetadataObject
): void {
  if (!contextMetadata) return

  const sequenceKey = contextMetadata[SEQUENCE_KEY_SYMBOL] as string | undefined
  if (sequenceKey) {
    registerSequenceKey(classType, sequenceKey)
  }
}
