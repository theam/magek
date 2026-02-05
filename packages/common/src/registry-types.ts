/**
 * Serializable descriptor types for MagekRegistry.describe() output.
 *
 * These types contain no function references and can be safely
 * serialized to JSON for introspection, tooling, and debugging.
 */

export interface CommandDescriptor {
  readonly name: string
  readonly properties: ReadonlyArray<{ name: string }>
  readonly methods: ReadonlyArray<{ name: string }>
  readonly hasAuthorizer: boolean
  readonly beforeHooksCount: number
}

export interface EventDescriptor {
  readonly name: string
}

export interface EntityDescriptor {
  readonly name: string
}

export interface ReducerDescriptor {
  readonly eventName: string
  readonly entityName: string
  readonly methodName: string
}

export interface QueryDescriptor {
  readonly name: string
  readonly properties: ReadonlyArray<{ name: string }>
  readonly methods: ReadonlyArray<{ name: string }>
  readonly hasAuthorizer: boolean
  readonly beforeHooksCount: number
}

export interface ReadModelDescriptor {
  readonly name: string
  readonly properties: ReadonlyArray<{ name: string }>
  readonly hasAuthorizer: boolean
  readonly beforeHooksCount: number
}

export interface EventHandlerDescriptor {
  readonly eventName: string
  readonly handlerCount: number
}

export interface NotificationDescriptor {
  readonly name: string
  readonly topic?: string
}

export interface RoleDescriptor {
  readonly name: string
}

export interface ScheduledCommandDescriptor {
  readonly name: string
}

export interface DataMigrationDescriptor {
  readonly name: string
}

export interface ProjectionDescriptor {
  readonly entityName: string
  readonly readModelName: string
  readonly methodName: string
}

export interface SchemaMigrationDescriptor {
  readonly conceptName: string
  readonly versions: ReadonlyArray<number>
}

/**
 * A complete, serializable snapshot of the application's structural metadata.
 * Returned by MagekRegistry.describe().
 */
export interface RegistrySnapshot {
  readonly commands: ReadonlyArray<CommandDescriptor>
  readonly events: ReadonlyArray<EventDescriptor>
  readonly entities: ReadonlyArray<EntityDescriptor>
  readonly reducers: ReadonlyArray<ReducerDescriptor>
  readonly queries: ReadonlyArray<QueryDescriptor>
  readonly readModels: ReadonlyArray<ReadModelDescriptor>
  readonly eventHandlers: ReadonlyArray<EventHandlerDescriptor>
  readonly notifications: ReadonlyArray<NotificationDescriptor>
  readonly roles: ReadonlyArray<RoleDescriptor>
  readonly scheduledCommands: ReadonlyArray<ScheduledCommandDescriptor>
  readonly dataMigrations: ReadonlyArray<DataMigrationDescriptor>
  readonly projections: ReadonlyArray<ProjectionDescriptor>
  readonly schemaMigrations: ReadonlyArray<SchemaMigrationDescriptor>
}
