import {
  Class,
  ReadModelAuthorizer,
  ReadModelFilterHooks,
  ReadModelInterface,
  ReadModelRoleAccess,
  getMetadata,
  defineMetadata,
} from '@magek/common'
import { Magek } from '../magek'
import { MagekAuthorizer } from '../authorizer'
import { getClassMetadata } from './metadata'
import { transferStage3FieldMetadata, isStage3ClassContext, Stage3ClassContext } from './stage3-utils'
import { transferSequenceKeyMetadata } from './sequenced-by'

/**
 * Decorator to register a class as a ReadModel
 * @param attributes
 */
export function ReadModel(
  attributes: ReadModelRoleAccess & ReadModelFilterHooks
): (readModelClass: Class<ReadModelInterface>, context?: Stage3ClassContext) => void {
  return (readModelClass, context?) => {
    // Transfer Stage 3 field metadata if applicable
    if (isStage3ClassContext(context)) {
      transferStage3FieldMetadata(readModelClass, context.metadata)
      transferSequenceKeyMetadata(readModelClass, context.metadata)
      transferCalculatedFieldDependencies(readModelClass, context.metadata)
    }

    Magek.configureCurrentEnv((config): void => {
      if (config.readModels[readModelClass.name]) {
        throw new Error(`A read model called ${readModelClass.name} is already registered.
        If you think that this is an error, try performing a clean build.`)
      }

      const authorizer = MagekAuthorizer.build(attributes) as ReadModelAuthorizer
      const classMetadata = getClassMetadata(readModelClass)
      const dynamicDependencies =
        getMetadata<Record<string, string[]>>('dynamic:dependencies', readModelClass as object) || {}

      // Combine fields with dynamic dependencies
      const fieldProperties = classMetadata.fields.map((field: any) => {
        return {
          ...field,
          dependencies: dynamicDependencies[field.name] || [],
        }
      })

      // Include calculated fields (getters) from methods with their dependencies
      const methodProperties = classMetadata.methods.map((method: any) => {
        return {
          ...method,
          // Dependencies already included in method from getAllGetters
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

/**
 * Stage 3 getter decorator context
 */
interface Stage3GetterContext {
  kind: 'getter'
  name: string | symbol
  static: boolean
  private: boolean
  metadata?: Record<string | symbol, unknown>
  access?: unknown
  addInitializer?: (initializer: () => void) => void
}

/**
 * Type guard for Stage 3 getter context
 */
function isStage3GetterContext(arg: unknown): arg is Stage3GetterContext {
  return (
    arg !== null &&
    typeof arg === 'object' &&
    'kind' in arg &&
    (arg as Stage3GetterContext).kind === 'getter' &&
    'name' in arg
  )
}

// Symbol for storing calculated field dependencies in Stage 3 decorator context.metadata
const CALCULATED_FIELDS_SYMBOL = Symbol.for('magek:calculatedFields')

/**
 * Transfer calculated field dependencies from Stage 3 context.metadata to class metadata.
 * Called by the ReadModel class decorator.
 */
function transferCalculatedFieldDependencies(
  classType: Function,
  contextMetadata?: Record<string | symbol, unknown>
): void {
  if (!contextMetadata) return
  
  const calculatedFields = contextMetadata[CALCULATED_FIELDS_SYMBOL] as Record<string, string[]> | undefined
  if (calculatedFields) {
    const existingDependencies =
      getMetadata<Record<string, string[]>>('dynamic:dependencies', classType as object) || {}
    for (const [propertyName, dependencies] of Object.entries(calculatedFields)) {
      existingDependencies[propertyName] = dependencies
    }
    defineMetadata('dynamic:dependencies', existingDependencies, classType as object)
  }
}

/**
 * Decorator to mark a property as a calculated field with dependencies.
 * Supports both legacy and Stage 3 decorators.
 * @param options - A `CalculatedFieldOptions` object indicating the dependencies.
 */
export function CalculatedField(
  options: CalculatedFieldOptions
): (target: object | Function, propertyKeyOrContext: string | symbol | Stage3GetterContext) => void {
  return (target: object | Function, propertyKeyOrContext: string | symbol | Stage3GetterContext): void => {
    // Detect Stage 3 getter decorator
    if (isStage3GetterContext(propertyKeyOrContext)) {
      const context = propertyKeyOrContext
      const propertyName = String(context.name)

      // Store in context.metadata for ReadModel decorator to pick up
      if (context.metadata) {
        if (!context.metadata[CALCULATED_FIELDS_SYMBOL]) {
          context.metadata[CALCULATED_FIELDS_SYMBOL] = {}
        }
        const calculatedFields = context.metadata[CALCULATED_FIELDS_SYMBOL] as Record<string, string[]>
        calculatedFields[propertyName] = options.dependsOn
      }

      // Also use addInitializer to set Reflect metadata
      if (context.addInitializer) {
        context.addInitializer(function (this: object) {
          const klass = this.constructor
          const existingDependencies =
            getMetadata<Record<string, string[]>>('dynamic:dependencies', klass as object) || {}
          existingDependencies[propertyName] = options.dependsOn
          defineMetadata('dynamic:dependencies', existingDependencies, klass as object)
        })
      }
      return
    }

    // Legacy decorator
    const propertyKey = propertyKeyOrContext as string | symbol
    const existingDependencies =
      getMetadata<Record<string | symbol, string[]>>('dynamic:dependencies', (target as object).constructor as object) ||
      {}
    existingDependencies[propertyKey] = options.dependsOn
    defineMetadata('dynamic:dependencies', existingDependencies, (target as object).constructor as object)
  }
}
