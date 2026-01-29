import {
  TraceActionTypes,
  DataMigrationInterface,
  DataMigrationMetadata,
  DataMigrationStatus,
  EntityInterface,
  Instance,
  Register,
  UUID,
  getLogger,
} from '@magek/common'
import { RegisterHandler } from './register-handler'
import { EventStore } from './services/event-store'
import { MagekDataMigrationEntity } from './core-concepts/data-migration/entities/data-migration-entity'
import { MagekEntityMigrated } from './core-concepts/data-migration/events/entity-migrated'
import { Magek } from './index'
import { MagekDataMigrationStarted } from './core-concepts/data-migration/events/data-migration-started'
import { trace } from './instrumentation'

export class MagekDataMigrations {
  @trace(TraceActionTypes.MIGRATION_RUN)
  public static async run(): Promise<boolean> {
    const config = Magek.config
    const logger = getLogger(config, 'MagekDataMigrationDispatcher#dispatch')
    let migrating = false

    const configuredMigrations = config.dataMigrationHandlers
    if (Object.keys(configuredMigrations).length === 0) {
      logger.debug('No defined migrations found. Skipping...')
      return false
    }

    const sortedConfiguredMigrations = MagekDataMigrations.sortConfiguredMigrations(configuredMigrations)
    const eventStore = new EventStore(config)
    for (const configuredMigration of Object.values(sortedConfiguredMigrations)) {
      const migrationEntityForConfiguredMigration = await eventStore.fetchEntitySnapshot(
        MagekDataMigrationEntity.name,
        configuredMigration.class.name
      )
      if (!migrationEntityForConfiguredMigration) {
        logger.debug('Not found running or finished migrations for the DataMigration', configuredMigration)
        migrating = true
        await MagekDataMigrations.migrate(configuredMigration)
      } else {
        const dataMigrationEntity = migrationEntityForConfiguredMigration.value as MagekDataMigrationEntity
        if (dataMigrationEntity.status === DataMigrationStatus.RUNNING) {
          logger.debug('Found running migrations for the DataMigration', configuredMigration)
          migrating = true
        }
      }
    }

    return migrating
  }

  public static migrateEntity(
    oldEntityName: string,
    oldEntityId: UUID,
    newEntity: Instance & EntityInterface
  ): Promise<void> {
    const requestID = UUID.generate()
    const register = new Register(requestID, {}, RegisterHandler.flush)
    register.events(new MagekEntityMigrated(oldEntityName, oldEntityId, newEntity.constructor.name, newEntity))
    return RegisterHandler.handle(Magek.config, register)
  }

  private static sortConfiguredMigrations(
    configuredMigrations: Record<string, DataMigrationMetadata>
  ): Array<DataMigrationMetadata> {
    return Object.values(configuredMigrations).sort((a: DataMigrationMetadata, b: DataMigrationMetadata) => {
      return a.migrationOptions.order - b.migrationOptions.order
    })
  }

  private static async migrate(migrationHandler: DataMigrationMetadata): Promise<void> {
    const startedRegister = new Register(UUID.generate(), {}, RegisterHandler.flush)

    await MagekDataMigrations.emitStarted(startedRegister, migrationHandler.class.name)
    await RegisterHandler.handle(Magek.config, startedRegister)

    const finishedRegister = new Register(UUID.generate(), {}, RegisterHandler.flush)
    await (migrationHandler.class as DataMigrationInterface).start(finishedRegister)
    await RegisterHandler.handle(Magek.config, finishedRegister)
  }

  private static async emitStarted(register: Register, configuredMigrationName: string): Promise<void> {
    const logger = getLogger(Magek.config, 'MagekMigration#emitStarted')
    logger.info('Migration started', configuredMigrationName)
    register.events(new MagekDataMigrationStarted(configuredMigrationName, new Date().toISOString()))
  }
}
