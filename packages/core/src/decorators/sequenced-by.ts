import { Magek } from '../magek'
import { Class, ReadModelInterface, AnyClass } from '@magek/common'
import { getFunctionArguments } from './metadata'

// Symbol for storing sequence key in Stage 3 decorator context.metadata
const SEQUENCE_KEY_SYMBOL = Symbol.for('magek:sequenceKey')

/**
 * Stage 3 field decorator context
 */
interface Stage3FieldContext {
  kind: 'field'
  name: string | symbol
  static: boolean
  private: boolean
  metadata?: Record<string | symbol, unknown>
  access?: unknown
  addInitializer?: (initializer: () => void) => void
}

/**
 * Type guard to detect Stage 3 field context
 */
function isStage3FieldContext(arg: unknown): arg is Stage3FieldContext {
  return (
    arg !== null &&
    typeof arg === 'object' &&
    'kind' in arg &&
    (arg as Stage3FieldContext).kind === 'field' &&
    'name' in arg
  )
}

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
 * Can be used as both a parameter decorator and property decorator.
 * Supports both legacy (experimentalDecorators) and Stage 3 decorators.
 */
export function sequencedBy(
  target: Class<ReadModelInterface> | Object | undefined,
  propertyKeyOrContext?: string | symbol | Stage3FieldContext,
  parameterIndex?: number
): void {
  // Detect Stage 3 field decorator
  if (isStage3FieldContext(propertyKeyOrContext)) {
    const context = propertyKeyOrContext
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
    return
  }

  // Legacy decorator handling
  const propertyKey = propertyKeyOrContext as string | symbol | undefined

  // Property decorator usage: @sequencedBy on a class property
  if (propertyKey !== undefined && parameterIndex === undefined) {
    const klass = (target as Object).constructor as Class<ReadModelInterface>
    const propertyName = String(propertyKey)
    registerSequenceKey(klass, propertyName)
  }
  // Parameter decorator usage: @sequencedBy on constructor parameter
  else if (parameterIndex !== undefined) {
    const klass = target as Class<ReadModelInterface>
    const args = getFunctionArguments(klass)
    const propertyName = args[parameterIndex]
    registerSequenceKey(klass, propertyName)
  }
}

/**
 * Transfer sequence key metadata from Stage 3 context to class.
 * Called by the ReadModel class decorator.
 */
export function transferSequenceKeyMetadata(
  classType: AnyClass,
  contextMetadata?: Record<string | symbol, unknown>
): void {
  if (!contextMetadata) return
  
  const sequenceKey = contextMetadata[SEQUENCE_KEY_SYMBOL] as string | undefined
  if (sequenceKey) {
    registerSequenceKey(classType, sequenceKey)
  }
}
