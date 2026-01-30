import {
  Class,
  ReadModelAuthorizer,
  ReadModelFilterHooks,
  ReadModelInterface,
  ReadModelRoleAccess,
  AnyClass,
} from '@magek/common'
import { Magek } from '../magek'
import { MagekAuthorizer } from '../authorizer'
import { getClassMetadata } from './metadata'
import { ClassDecoratorContext, GetterDecoratorContext } from './decorator-utils'
import { SEQUENCE_KEY_SYMBOL } from './sequenced-by'

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
 * Decorator to register a class as a ReadModel.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * @param attributes
 */
export function ReadModel(
  attributes: ReadModelRoleAccess & ReadModelFilterHooks
): (readModelClass: Class<ReadModelInterface>, context: ClassDecoratorContext) => void {
  return (readModelClass, context) => {
    // Read sequence key from Symbol.metadata and register to config
    const sequenceKey = (context.metadata as Record<symbol, unknown> | undefined)?.[SEQUENCE_KEY_SYMBOL] as string | undefined
    if (sequenceKey) {
      registerSequenceKey(readModelClass, sequenceKey)
    }

    Magek.configureCurrentEnv((config): void => {
      if (config.readModels[readModelClass.name]) {
        throw new Error(`A read model called ${readModelClass.name} is already registered.
        If you think that this is an error, try performing a clean build.`)
      }

      const authorizer = MagekAuthorizer.build(attributes) as ReadModelAuthorizer
      // Pass context.metadata because Symbol.metadata isn't attached to class yet during decorator execution
      const classMetadata = getClassMetadata(readModelClass, context.metadata)

      // Combine fields with empty dependencies (fields don't have dependencies)
      const fieldProperties = classMetadata.fields.map((field) => {
        return {
          ...field,
          dependencies: [] as string[],
        }
      })

      // Include calculated fields (getters) from methods with their dependencies
      // Dependencies are already included in method from getAllGetters (reads from Symbol.metadata)
      const methodProperties = classMetadata.methods.map((method) => {
        return {
          ...method,
        }
      })

      // Merge fields and methods into properties
      const properties = [...fieldProperties, ...methodProperties]

      config.readModels[readModelClass.name] = {
        class: readModelClass,
        properties,
        authorizer,
        before: attributes.before ?? [],
      }
    })
  }
}

interface CalculatedFieldOptions {
  dependsOn: string[]
}

/** Symbol for storing calculated field dependencies in decorator context.metadata */
export const CALCULATED_FIELDS_SYMBOL = Symbol.for('magek:calculatedFields')

/**
 * Decorator to mark a property as a calculated field with dependencies.
 *
 * Uses TC39 Stage 3 decorators.
 * Dependencies are stored in context.metadata and read by field-metadata-reader.
 *
 * @param options - A `CalculatedFieldOptions` object indicating the dependencies.
 */
export function calculatedField(
  options: CalculatedFieldOptions
): (target: Function, context: GetterDecoratorContext) => void {
  return (_target: Function, context: GetterDecoratorContext): void => {
    const propertyName = String(context.name)

    // Store in context.metadata (becomes class[Symbol.metadata])
    if (context.metadata) {
      if (!context.metadata[CALCULATED_FIELDS_SYMBOL]) {
        context.metadata[CALCULATED_FIELDS_SYMBOL] = {}
      }
      const calculatedFields = context.metadata[CALCULATED_FIELDS_SYMBOL] as Record<string, string[]>
      calculatedFields[propertyName] = options.dependsOn
    }
  }
}

// Re-export with PascalCase alias for backward compatibility during migration
// TODO: Remove this alias after all usages have been updated to @calculatedField
export { calculatedField as CalculatedField }
