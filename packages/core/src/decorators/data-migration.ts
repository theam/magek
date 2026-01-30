import { Magek } from '../magek'
import { DataMigrationInterface, DataMigrationParameters } from '@magek/common'
import { ClassDecoratorContext } from './decorator-types'

/**
 * Decorator to mark a class as a Magek Data Migration.
 * Data migrations are background processes that update existing data in the database.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * @param attributes - Migration configuration (e.g., execution order)
 * @returns A class decorator function
 */
export function DataMigration(
  attributes: DataMigrationParameters
): (dataMigrationClass: DataMigrationInterface, context: ClassDecoratorContext) => void {
  return (migrationClass) => {
    Magek.configureCurrentEnv((config): void => {
      if (config.dataMigrationHandlers[migrationClass.name]) {
        throw new Error(`A data migration called ${migrationClass.name} is already registered.
        If you think that this is an error, try performing a clean build.`)
      }

      config.dataMigrationHandlers[migrationClass.name] = {
        class: migrationClass,
        migrationOptions: attributes,
      }
    })
  }
}
