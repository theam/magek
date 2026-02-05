import { Magek } from '../magek'
import { Class, AnyClass, SchemaMigrationMetadata, getMetadata, defineMetadata } from '@magek/common'
import { MethodDecoratorContext, ClassDecoratorContext } from './decorator-types'

const migrationMethodsMetadataKey = 'magek:migrationsMethods'

// Symbol for storing migration metadata in decorator context.metadata
const MIGRATIONS_METADATA_KEY = Symbol.for('magek:migrationsMethods')

/**
 * **NOTE:** Using this decorator for read model migrations is deprecated. Prefer using `@DataMigration` instead.
 *
 * Uses TC39 Stage 3 decorators.
 */
export function SchemaMigration(
  conceptClass: AnyClass
): (schemaMigrationClass: AnyClass, context: ClassDecoratorContext) => void {
  return (schemaMigrationClass, context) => {
    Magek.configureCurrentEnv((config) => {
      // Get migration methods from context.metadata
      let migrationMethodsMetadata: Array<SchemaMigrationMetadata>

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

      if (!migrationMethodsMetadata || migrationMethodsMetadata.length === 0) {
        throw new Error(
          'No migration methods found in this class. Define at least one migration and annotate it with @toVersion()'
        )
      }

      for (const schemaMigrationMetadata of migrationMethodsMetadata) {
        config.registry.registerSchemaMigration(
          conceptClass.name,
          schemaMigrationMetadata.toVersion,
          schemaMigrationMetadata
        )
      }
    })
  }
}

/**
 * Decorator to tell Magek the version you are migrating to.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * @param toVersion
 * @param props
 */
export function toVersion<TOldSchema, TNewSchema>(
  toVersion: number,
  props: {
    fromSchema: Class<TOldSchema>
    toSchema: Class<TNewSchema>
  }
): (
  method: Function,
  context: MethodDecoratorContext
) => void {
  if (toVersion <= 1) {
    throw new Error('Migration versions must always be greater than 1')
  }

  return (_method, context): void => {
    // Stage 3 decorator - store in context.metadata so @SchemaMigration can read it
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

    // Also store in Reflect metadata for standalone usage
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
  }
}
