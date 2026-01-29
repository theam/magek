import { Magek } from '../magek'
import { Class, AnyClass, SchemaMigrationMetadata, MagekConfig, Instance, getMetadata, defineMetadata } from '@magek/common'

const migrationMethodsMetadataKey = 'magek:migrationsMethods'

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

/**
 * Stage 3 class decorator context
 */
interface Stage3ClassContext {
  kind: 'class'
  name: string | undefined
  metadata?: Record<string | symbol, unknown>
  addInitializer?: (initializer: () => void) => void
}

/**
 * Type guard to detect Stage 3 method decorator context
 */
function isStage3MethodContext(arg: unknown): arg is Stage3MethodContext {
  return (
    arg !== null &&
    typeof arg === 'object' &&
    'kind' in arg &&
    (arg as Stage3MethodContext).kind === 'method' &&
    'name' in arg
  )
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

// Symbol for storing migration metadata in Stage 3 decorator context.metadata
const MIGRATIONS_METADATA_KEY = Symbol.for('magek:migrationsMethods')

/**
 * **NOTE:** Using this decorator for read model migrations is deprecated. Prefer using `@DataMigration` instead.
 */
export function SchemaMigration(
  conceptClass: AnyClass
): (schemaMigrationClass: AnyClass, context?: Stage3ClassContext) => void {
  return (schemaMigrationClass, context?) => {
    Magek.configureCurrentEnv((config) => {
      const conceptMigrations = getConceptMigrations(config, conceptClass)

      // Get migration methods - for Stage 3, read from context.metadata first
      let migrationMethodsMetadata: Array<SchemaMigrationMetadata>

      if (isStage3ClassContext(context)) {
        // Stage 3: read from context.metadata
        if (context.metadata) {
          migrationMethodsMetadata =
            (context.metadata[MIGRATIONS_METADATA_KEY] as Array<SchemaMigrationMetadata>) || []
          // Update each metadata entry with the actual class reference
          migrationMethodsMetadata = migrationMethodsMetadata.map((m) => ({
            ...m,
            migrationClass: schemaMigrationClass,
          }))
        } else {
          migrationMethodsMetadata = []
        }
      } else {
        // Legacy: read from Reflect.getMetadata
        migrationMethodsMetadata = getMigrationMethods(schemaMigrationClass)
      }

      if (!migrationMethodsMetadata || migrationMethodsMetadata.length === 0) {
        throw new Error(
          'No migration methods found in this class. Define at least one migration and annotate it with @ToVersion()'
        )
      }

      for (const schemaMigrationMetadata of migrationMethodsMetadata) {
        if (conceptMigrations.has(schemaMigrationMetadata.toVersion)) {
          throw new Error(
            `Found duplicated migration for '${conceptClass.name}' in migration class '${schemaMigrationClass.name}': ` +
              `There is an already defined migration for version ${schemaMigrationMetadata.toVersion}`
          )
        }

        conceptMigrations.set(schemaMigrationMetadata.toVersion, schemaMigrationMetadata)
      }
    })
  }
}

function getConceptMigrations(config: MagekConfig, conceptClass: AnyClass): Map<number, SchemaMigrationMetadata> {
  if (!config.schemaMigrations[conceptClass.name]) {
    config.schemaMigrations[conceptClass.name] = new Map()
  }
  return config.schemaMigrations[conceptClass.name]
}

function getMigrationMethods(migrationClass: AnyClass): Array<SchemaMigrationMetadata> {
  const migrationMethods =
    getMetadata<Array<SchemaMigrationMetadata>>(migrationMethodsMetadataKey, migrationClass as object)
  if (!migrationMethods || migrationMethods.length == 0) {
    throw new Error(
      'No migration methods found in this class. Define at least one migration and annotate it with @ToVersion()'
    )
  }
  return migrationMethods
}

/**
 * Decorator to tell Magek the version you are migrating to
 * @param toVersion
 * @param props
 */
export function ToVersion<TOldSchema, TNewSchema>(
  toVersion: number,
  props: {
    fromSchema: Class<TOldSchema>
    toSchema: Class<TNewSchema>
  }
): (
  migrationInstanceOrMethod: Instance | Function,
  propertyNameOrContext: string | Stage3MethodContext,
  propertyDescriptor?: MigrationMethod<TOldSchema, TNewSchema>
) => void {
  if (toVersion <= 1) {
    throw new Error('Migration versions must always be greater than 1')
  }

  return (migrationInstanceOrMethod, propertyNameOrContext): void => {
    // Detect Stage 3 vs Legacy decorator
    if (isStage3MethodContext(propertyNameOrContext)) {
      // Stage 3 decorator - store in context.metadata so @SchemaMigration can read it
      const context = propertyNameOrContext

      if (context.metadata) {
        // Get or initialize the migrations array in context.metadata
        let migrationMethods = context.metadata[MIGRATIONS_METADATA_KEY] as
          | Array<SchemaMigrationMetadata>
          | undefined
        if (!migrationMethods) {
          migrationMethods = []
          context.metadata[MIGRATIONS_METADATA_KEY] = migrationMethods
        }

        // Add this migration (migrationClass will be set by @SchemaMigration)
        migrationMethods.push({
          migrationClass: undefined as unknown as AnyClass, // Will be set by @SchemaMigration
          methodName: context.name.toString(),
          toVersion,
          fromSchema: props.fromSchema,
          toSchema: props.toSchema,
        })
      }

      // Also store in Reflect metadata for the standalone test case
      if (context.addInitializer) {
        context.addInitializer(function (this: Function) {
          const migrationClass = context.static ? (this as AnyClass) : (this.constructor as AnyClass)

          let reflectMethods = getMetadata<Array<SchemaMigrationMetadata>>(
            migrationMethodsMetadataKey,
            migrationClass as object
          )
          if (!reflectMethods) {
            reflectMethods = []
          }

          reflectMethods.push({
            migrationClass,
            methodName: context.name.toString(),
            toVersion,
            fromSchema: props.fromSchema,
            toSchema: props.toSchema,
          })

          defineMetadata(migrationMethodsMetadataKey, reflectMethods, migrationClass as object)
        })
      }
    } else {
      // Legacy decorator
      const migrationInstance = migrationInstanceOrMethod as Instance
      const propertyName = propertyNameOrContext as string
      const migrationClass = migrationInstance.constructor as AnyClass

      let migrationMethods = getMetadata<Array<SchemaMigrationMetadata>>(
        migrationMethodsMetadataKey,
        migrationClass as object
      )
      if (!migrationMethods) {
        migrationMethods = []
      }

      migrationMethods.push({
        migrationClass,
        methodName: propertyName,
        toVersion,
        fromSchema: props.fromSchema,
        toSchema: props.toSchema,
      })

      // Here we just store the information (version and method). All the checks will be done in the @Migrates decorator
      defineMetadata(migrationMethodsMetadataKey, migrationMethods, migrationClass as object)
    }
  }
}

type MigrationMethod<TOldSchema, TNewSchema> = TypedPropertyDescriptor<(old: TOldSchema) => Promise<TNewSchema>>
