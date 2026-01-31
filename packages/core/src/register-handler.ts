import {
  MAGEK_SUPER_KIND,
  MagekConfig,
  DOMAIN_SUPER_KIND,
  EventInterface,
  Instance,
  NonPersistedEventEnvelope,
  NotFoundError,
  Register,
  SuperKindType,
  UUID,
  NotificationInterface,
  ReducerMetadata,
  getTimestampGenerator,
} from '@magek/common'
import { MagekEntityMigrated } from './core-concepts/data-migration/events/entity-migrated'
import { MagekDataMigrationStarted } from './core-concepts/data-migration/events/data-migration-started'
import { MagekDataMigrationFinished } from './core-concepts/data-migration/events/data-migration-finished'
import { Magek } from './magek'
import { MagekEntityTouched } from './core-concepts/touch-entity/events/entity-touched'

const eventsTypesNames: Array<string> = [
  MagekEntityMigrated.name,
  MagekDataMigrationStarted.name,
  MagekDataMigrationFinished.name,
  MagekEntityTouched.name,
]

export class RegisterHandler {
  public static async handle(config: MagekConfig, register: Register): Promise<void> {
    if (register.eventList.length == 0) {
      return
    }

    await config.eventStore.store(
      register.eventList.map((event) => RegisterHandler.wrapEvent(config, event, register)),
      config
    )
  }

  public static async flush(record: Register): Promise<void> {
    return RegisterHandler.handle(Magek.config, record)
  }

  private static wrapEvent(
    config: MagekConfig,
    event: Instance & (EventInterface | NotificationInterface),
    register: Register
  ): NonPersistedEventEnvelope {
    const eventTypeName = event.constructor.name
    const entityTypeName = RegisterHandler.getTopicName(eventTypeName, event, config)
    if (!entityTypeName) {
      throw new NotFoundError(
        `Couldn't find information about event ${eventTypeName}. Is the event handled by an entity?`
      )
    }
    const entityID = RegisterHandler.getPartitionKey(event, config)
    if (!entityID) {
      throw new Error(
        `Event ${eventTypeName} has an empty 'entityID' or the required 'entityID' method was not implemented. Make sure to return a string-compatible value identifying the entity this event belongs to.`
      )
    }

    return {
      version: config.currentVersionFor(eventTypeName),
      kind: 'event',
      superKind: RegisterHandler.getSuperKind(eventTypeName),
      entityID,
      requestID: register.requestID,
      currentUser: register.currentUser,
      entityTypeName,
      typeName: eventTypeName,
      value: event,
      createdAt: getTimestampGenerator().next(),
    }
  }

  private static getSuperKind(eventTypeName: string): SuperKindType {
    return eventsTypesNames.includes(eventTypeName) ? MAGEK_SUPER_KIND : DOMAIN_SUPER_KIND
  }

  private static getTopicName(
    eventTypeName: string,
    event: Instance & (EventInterface | NotificationInterface),
    config: MagekConfig
  ): string {
    if (eventTypeName === MagekEntityMigrated.name) {
      return (event as MagekEntityMigrated).oldEntityName
    }
    if (eventTypeName === MagekEntityTouched.name) {
      return (event as MagekEntityTouched).entityName
    }
    if (eventTypeName in config.notifications) {
      return config.eventToTopic[eventTypeName] ?? 'defaultTopic'
    }
    const reducerInfo: ReducerMetadata | undefined = config.reducers[eventTypeName]
    return reducerInfo?.class?.name
  }

  private static getPartitionKey(
    event: Instance & (EventInterface | NotificationInterface),
    config: MagekConfig
  ): UUID {
    const eventName = event.constructor.name
    const evtObject = event as Record<string, unknown>
    const entityIdField = config.partitionKeys[eventName]
    if (entityIdField && entityIdField in evtObject && typeof evtObject[entityIdField] === 'string') {
      return evtObject[entityIdField] as UUID
    }
    if (eventName in config.notifications) {
      return RegisterHandler.getDefaultNotificationPartitionId(event)
    }
    return RegisterHandler.getDefaultStateEventEntityId(event as Instance & EventInterface)
  }

  private static getDefaultStateEventEntityId(event: Instance & EventInterface): UUID {
    const entityID = event.entityID()
    if (entityID) {
      return entityID
    }
    throw new Error(
      `Event ${event.constructor.name} has no specification for the entity ID. Make sure to specify a string-compatible value identifying the entity this event belongs to.

      You can do it by:

      1. Adding an entityID method to the event`
    )
  }

  private static getDefaultNotificationPartitionId(event: Instance & NotificationInterface): UUID {
    if (event.partitionId && typeof event.partitionId === 'string') {
      return event.partitionId
    }
    return 'default'
  }
}
