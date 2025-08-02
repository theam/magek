import { MagekDataMigrationEntityDuration, DataMigrationStatus } from '@magek/common'
import { MagekDataMigrationStarted } from '../events/data-migration-started'
import { MagekDataMigrationFinished } from '../events/data-migration-finished'

export class MagekDataMigrationEntity {
  public constructor(
    public id: string,
    public status: DataMigrationStatus,
    public lastUpdated: string,
    public duration?: MagekDataMigrationEntityDuration
  ) {}

  public static started(
    event: MagekDataMigrationStarted,
    currentDataMigration: MagekDataMigrationEntity
  ): MagekDataMigrationEntity {
    const duration = {
      start: new Date().toISOString(),
    }
    return new MagekDataMigrationEntity(event.name, DataMigrationStatus.RUNNING, event.lastUpdated, duration)
  }

  public static finished(
    event: MagekDataMigrationFinished,
    currentDataMigration: MagekDataMigrationEntity
  ): MagekDataMigrationEntity {
    const current = new Date()
    if (currentDataMigration.duration?.start) {
      const start = currentDataMigration.duration.start
      const end = current.toISOString()
      const startTime = Date.parse(start)
      const endTime = current.getTime()
      const elapsedTime = endTime - startTime
      const duration: MagekDataMigrationEntityDuration = {
        start: start,
        end: end,
        elapsedMilliseconds: elapsedTime,
      }
      return new MagekDataMigrationEntity(event.name, DataMigrationStatus.FINISHED, event.lastUpdated, duration)
    }
    return new MagekDataMigrationEntity(event.name, DataMigrationStatus.FINISHED, event.lastUpdated)
  }
}
