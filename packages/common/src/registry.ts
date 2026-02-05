import {
  CommandMetadata,
  CommandAuthorizer,
  CommandBeforeFunction,
  CommandHandler,
  DataMigrationMetadata,
  EntityInterface,
  EntityMetadata,
  EventHandlerInterface,
  EventMetadata,
  NotificationMetadata,
  ProjectionMetadata,
  QueryMetadata,
  ReadModelInterface,
  ReadModelMetadata,
  ReducerMetadata,
  RoleMetadata,
  ScheduledCommandMetadata,
  SchemaMigrationMetadata,
  RoleInterface,
} from './concepts'
import { PropertyMetadata } from './metadata-types'
import { Class } from './typelevel'
import { MagekAuthorizer } from './authorizer'
import {
  RegistrySnapshot,
  CommandDescriptor,
  EventDescriptor,
  EntityDescriptor,
  ReducerDescriptor,
  QueryDescriptor,
  ReadModelDescriptor,
  EventHandlerDescriptor,
  NotificationDescriptor,
  RoleDescriptor,
  ScheduledCommandDescriptor,
  DataMigrationDescriptor,
  ProjectionDescriptor,
  SchemaMigrationDescriptor,
} from './registry-types'

type EntityName = string
type EventName = string
type CommandName = string
type QueryName = string
type ReadModelName = string
type RoleName = string
type ConceptName = string
type Version = number
type ScheduledCommandName = string
type DataMigrationName = string

/**
 * Options for defining a command via the DSL
 */
export interface CommandOptions {
  readonly authorize?: 'all' | Array<Class<RoleInterface>> | CommandAuthorizer
  readonly before?: Array<CommandBeforeFunction>
  readonly properties: Array<PropertyMetadata>
  readonly methods?: Array<PropertyMetadata>
}

/**
 * MagekRegistry holds all structural metadata for a Magek application.
 *
 * This is the single source of truth for concept registrations:
 * commands, events, entities, reducers, queries, read models, etc.
 *
 * Runtime configuration (adapters, log levels, app name) lives in MagekConfig.
 */
export class MagekRegistry {
  // ─── Data Store (all 19 metadata collections) ───────────────────────
  readonly commandHandlers: Record<CommandName, CommandMetadata> = {}
  readonly events: Record<EventName, EventMetadata> = {}
  readonly notifications: Record<EventName, NotificationMetadata> = {}
  readonly entities: Record<EntityName, EntityMetadata> = {}
  readonly reducers: Record<EventName, ReducerMetadata> = {}
  readonly queryHandlers: Record<QueryName, QueryMetadata> = {}
  readonly eventHandlers: Record<EventName, Array<EventHandlerInterface>> = {}
  readonly readModels: Record<ReadModelName, ReadModelMetadata> = {}
  readonly projections: Record<EntityName, Array<ProjectionMetadata<EntityInterface, ReadModelInterface>>> = {}
  readonly unProjections: Record<EntityName, Array<ProjectionMetadata<EntityInterface, ReadModelInterface>>> = {}
  readonly readModelSequenceKeys: Record<EntityName, string> = {}
  readonly roles: Record<RoleName, RoleMetadata> = {}
  readonly schemaMigrations: Record<ConceptName, Map<Version, SchemaMigrationMetadata>> = {}
  readonly scheduledCommandHandlers: Record<ScheduledCommandName, ScheduledCommandMetadata> = {}
  readonly dataMigrationHandlers: Record<DataMigrationName, DataMigrationMetadata> = {}
  readonly nonExposedGraphQLMetadataKey: Record<string, Array<string>> = {}
  readonly partitionKeys: Record<EventName, string> = {}
  readonly topicToEvent: Record<string, EventName> = {}
  readonly eventToTopic: Record<EventName, string> = {}

  // ─── DSL Methods ────────────────────────────────────────────────────

  /**
   * Defines and registers a command using the declarative DSL.
   */
  command<TInput = unknown, TResult = unknown>(
    name: string,
    options: CommandOptions,
    handler: CommandHandler<TInput, TResult>
  ): CommandMetadata<TInput, TResult> {
    const authorizer = MagekAuthorizer.build({ authorize: options.authorize }) as CommandAuthorizer

    const metadata: CommandMetadata<TInput, TResult> = {
      name,
      properties: options.properties,
      handler,
      authorizer,
      before: options.before ?? [],
      methods: options.methods ?? [],
    }

    this.registerCommand(name, metadata as CommandMetadata<unknown, unknown>)
    return metadata
  }

  // ─── Registration Methods (used by decorators and DSL) ──────────────

  registerCommand(name: string, metadata: CommandMetadata): void {
    if (this.commandHandlers[name]) {
      throw new Error(
        `A command called ${name} is already registered. ` +
          'If you think that this is an error, try performing a clean build.'
      )
    }
    this.commandHandlers[name] = metadata
  }

  registerEvent(name: string, metadata: EventMetadata): void {
    if (this.events[name]) {
      throw new Error(
        `A event called ${name} is already registered. ` +
          'If you think that this is an error, try performing a clean build.'
      )
    }
    this.events[name] = metadata
  }

  registerEntity(name: string, metadata: EntityMetadata): void {
    if (this.entities[name]) {
      throw new Error(
        `An entity called ${name} is already registered. ` +
          'If you think that this is an error, try performing a clean build.'
      )
    }
    this.entities[name] = metadata
  }

  registerReducer(eventName: string, metadata: ReducerMetadata): void {
    if (this.reducers[eventName]) {
      const existing = this.reducers[eventName]
      throw new Error(
        `Error registering reducer: The event ${eventName} was already registered to be reduced by method ${existing.methodName} in the entity ${existing.class.name}. ` +
          'If you think that this is an error, try performing a clean build.'
      )
    }
    this.reducers[eventName] = metadata
  }

  registerQuery(name: string, metadata: QueryMetadata): void {
    if (this.queryHandlers[name]) {
      throw new Error(
        `A query called ${name} is already registered. ` +
          'If you think that this is an error, try performing a clean build.'
      )
    }
    this.queryHandlers[name] = metadata
  }

  registerReadModel(name: string, metadata: ReadModelMetadata): void {
    if (this.readModels[name]) {
      throw new Error(
        `A read model called ${name} is already registered. ` +
          'If you think that this is an error, try performing a clean build.'
      )
    }
    this.readModels[name] = metadata
  }

  registerEventHandler(eventName: string, handler: EventHandlerInterface): void {
    const registered = this.eventHandlers[eventName] || []
    if (registered.some((h) => h === handler)) {
      return // deduplicate
    }
    registered.push(handler)
    this.eventHandlers[eventName] = registered
  }

  registerNotification(name: string, metadata: NotificationMetadata): void {
    if (this.notifications[name] || this.events[name]) {
      throw new Error(
        `A notification called ${name} is already registered. ` +
          'If you think that this is an error, try performing a clean build.'
      )
    }
    this.notifications[name] = metadata
  }

  registerRole(name: string, metadata: RoleMetadata): void {
    this.roles[name] = metadata
  }

  registerScheduledCommand(name: string, metadata: ScheduledCommandMetadata): void {
    if (this.scheduledCommandHandlers[name]) {
      throw new Error(
        `A command called ${name} is already registered. ` +
          'If you think that this is an error, try performing a clean build.'
      )
    }
    this.scheduledCommandHandlers[name] = metadata
  }

  registerDataMigration(name: string, metadata: DataMigrationMetadata): void {
    if (this.dataMigrationHandlers[name]) {
      throw new Error(
        `A data migration called ${name} is already registered. ` +
          'If you think that this is an error, try performing a clean build.'
      )
    }
    this.dataMigrationHandlers[name] = metadata
  }

  registerProjection(
    entityName: string,
    metadata: ProjectionMetadata<EntityInterface, ReadModelInterface>
  ): void {
    const existing = this.projections[entityName] || []
    if (existing.indexOf(metadata) < 0) {
      existing.push(metadata)
      this.projections[entityName] = existing
    }
  }

  registerUnProjection(
    entityName: string,
    metadata: ProjectionMetadata<EntityInterface, ReadModelInterface>
  ): void {
    const existing = this.unProjections[entityName] || []
    if (existing.indexOf(metadata) < 0) {
      existing.push(metadata)
      this.unProjections[entityName] = existing
    }
  }

  registerSequenceKey(className: string, propertyName: string): void {
    if (this.readModelSequenceKeys[className] && this.readModelSequenceKeys[className] !== propertyName) {
      throw new Error(
        `Error trying to register a sort key named \`${propertyName}\` for class \`${className}\`. ` +
          `It already had the sort key \`${this.readModelSequenceKeys[className]}\` defined and only one sort key is allowed for each read model.`
      )
    }
    this.readModelSequenceKeys[className] = propertyName
  }

  registerNonExposedFields(className: string, fields: Array<string>): void {
    this.nonExposedGraphQLMetadataKey[className] = fields
  }

  registerPartitionKey(eventName: string, propertyName: string): void {
    this.partitionKeys[eventName] = propertyName
  }

  registerTopicMapping(eventName: string, topic: string): void {
    this.eventToTopic[eventName] = topic
    this.topicToEvent[topic] = eventName
  }

  registerSchemaMigration(conceptName: string, version: number, metadata: SchemaMigrationMetadata): void {
    if (!this.schemaMigrations[conceptName]) {
      this.schemaMigrations[conceptName] = new Map()
    }
    const conceptMigrations = this.schemaMigrations[conceptName]
    if (conceptMigrations.has(version)) {
      throw new Error(
        `Found duplicated migration for '${conceptName}': ` +
          `There is an already defined migration for version ${version}`
      )
    }
    conceptMigrations.set(version, metadata)
  }

  // ─── Structural Methods (moved from MagekConfig) ───────────────────

  /**
   * Returns the current (latest) schema version for a concept.
   */
  currentVersionFor(className: string): number {
    const migrations = this.schemaMigrations[className]
    if (!migrations) {
      return 1
    }
    return Math.max(...migrations.keys())
  }

  /**
   * Validates that all schema migrations are consecutive (no gaps).
   */
  validateSchemaMigrations(): void {
    for (const conceptName in this.schemaMigrations) {
      this.validateConceptSchemaMigrations(conceptName, this.schemaMigrations[conceptName])
    }
  }

  /**
   * Returns true if the application has defined any roles.
   */
  hasRoles(): boolean {
    return Object.entries(this.roles).length > 0
  }

  // ─── Introspection ─────────────────────────────────────────────────

  /**
   * Returns a serializable snapshot of the entire application structure.
   * The output contains no function references and can be safely JSON.stringify'd.
   */
  describe(): RegistrySnapshot {
    const commands: CommandDescriptor[] = Object.entries(this.commandHandlers).map(([name, meta]) => ({
      name,
      properties: meta.properties.map((p) => ({ name: p.name })),
      methods: meta.methods.map((m) => ({ name: m.name })),
      hasAuthorizer: !!meta.authorizer,
      beforeHooksCount: meta.before.length,
    }))

    const events: EventDescriptor[] = Object.keys(this.events).map((name) => ({ name }))

    const entities: EntityDescriptor[] = Object.keys(this.entities).map((name) => ({ name }))

    const reducers: ReducerDescriptor[] = Object.entries(this.reducers).map(([eventName, meta]) => ({
      eventName,
      entityName: meta.class.name,
      methodName: meta.methodName,
    }))

    const queries: QueryDescriptor[] = Object.entries(this.queryHandlers).map(([name, meta]) => ({
      name,
      properties: meta.properties.map((p) => ({ name: p.name })),
      methods: meta.methods.map((m) => ({ name: m.name })),
      hasAuthorizer: !!meta.authorizer,
      beforeHooksCount: meta.before.length,
    }))

    const readModels: ReadModelDescriptor[] = Object.entries(this.readModels).map(([name, meta]) => ({
      name,
      properties: meta.properties.map((p) => ({ name: p.name })),
      hasAuthorizer: !!meta.authorizer,
      beforeHooksCount: meta.before.length,
    }))

    const eventHandlers: EventHandlerDescriptor[] = Object.entries(this.eventHandlers).map(
      ([eventName, handlers]) => ({
        eventName,
        handlerCount: handlers.length,
      })
    )

    const notifications: NotificationDescriptor[] = Object.entries(this.notifications).map(([name]) => ({
      name,
      topic: this.eventToTopic[name],
    }))

    const roles: RoleDescriptor[] = Object.keys(this.roles).map((name) => ({ name }))

    const scheduledCommands: ScheduledCommandDescriptor[] = Object.keys(this.scheduledCommandHandlers).map(
      (name) => ({ name })
    )

    const dataMigrations: DataMigrationDescriptor[] = Object.keys(this.dataMigrationHandlers).map((name) => ({
      name,
    }))

    const projections: ProjectionDescriptor[] = Object.entries(this.projections).flatMap(
      ([entityName, metas]) =>
        metas.map((m) => ({
          entityName,
          readModelName: m.class.name,
          methodName: m.methodName,
        }))
    )

    const schemaMigrations: SchemaMigrationDescriptor[] = Object.entries(this.schemaMigrations).map(
      ([conceptName, migrations]) => ({
        conceptName,
        versions: [...migrations.keys()].sort((a, b) => a - b),
      })
    )

    return {
      commands,
      events,
      entities,
      reducers,
      queries,
      readModels,
      eventHandlers,
      notifications,
      roles,
      scheduledCommands,
      dataMigrations,
      projections,
      schemaMigrations,
    }
  }

  // ─── Private ────────────────────────────────────────────────────────

  private validateConceptSchemaMigrations(
    conceptName: string,
    migrations: Map<number, SchemaMigrationMetadata>
  ): void {
    const currentVersion = this.currentVersionFor(conceptName)
    for (let toVersion = 2; toVersion <= currentVersion; toVersion++) {
      if (!migrations.has(toVersion)) {
        throw new Error(
          `Schema Migrations for '${conceptName}' are invalid: they are missing a migration with toVersion=${toVersion}. ` +
            `There must be a migration for '${conceptName}' for every version in the range [2..${currentVersion}]`
        )
      }
    }
  }
}
