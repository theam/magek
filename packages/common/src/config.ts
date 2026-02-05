import {
  EventStreamConfiguration,
  GlobalErrorHandlerMetadata,
  TokenVerifier,
} from './concepts'
import { Runtime } from './runtime'
import { EventStoreAdapter } from './event-store-adapter'
import { ReadModelStoreAdapter } from './read-model-store-adapter'
import { SessionStoreAdapter } from './session-store-adapter'
import { Level } from './logger'
import * as path from 'path'
import { DEFAULT_SENSOR_HEALTH_CONFIGURATIONS, HealthIndicatorMetadata, Logger, SensorConfiguration } from '.'
import { TraceConfiguration } from './instrumentation/trace-types'
import { MagekRegistry } from './registry'

/**
 * Class used by external packages that needs to get a representation of
 * the Magek config.
 *
 * Structural metadata (commands, events, entities, etc.) lives in the `registry`.
 * This class holds only runtime configuration (adapters, log level, app name, etc.).
 */
export class MagekConfig {
  public logLevel: Level = Level.debug
  public logPrefix?: string
  public logger?: Logger

  private _runtime?: Runtime
  public eventStoreAdapter?: EventStoreAdapter
  public readModelStoreAdapter?: ReadModelStoreAdapter
  public sessionStoreAdapter?: SessionStoreAdapter

  public appName = 'new-magek-app'

  public assets?: Array<string>

  public defaultResponseHeaders: Record<string, string> = {}

  public readonly subscriptions = {
    maxConnectionDurationInSeconds: 7 * 24 * 60 * 60, // 7 days
    maxDurationInSeconds: 2 * 24 * 60 * 60, // 2 days
  }

  public enableGraphQLIntrospection = true

  private _userProjectRootPath?: string

  public readonly codeRelativePath: string = 'dist'

  public readonly eventDispatcherHandler: string = path.join(this.codeRelativePath, 'index.eventDispatcher')
  public readonly eventStreamConsumer: string = path.join(this.codeRelativePath, 'index.consumeEventStream')
  public readonly eventStreamProducer: string = path.join(this.codeRelativePath, 'index.produceEventStream')
  public readonly serveGraphQLHandler: string = path.join(this.codeRelativePath, 'index.graphQLDispatcher')
  public readonly sensorHealthHandler: string = path.join(this.codeRelativePath, 'index.health')
  public readonly scheduledTaskHandler: string = path.join(
    this.codeRelativePath,
    'index.triggerScheduledCommands'
  )
  public readonly notifySubscribersHandler: string = path.join(this.codeRelativePath, 'index.notifySubscribers')

  public readonly functionRelativePath: string = path.join('..', this.codeRelativePath, 'index.js')

  public userHealthIndicators: Record<string, HealthIndicatorMetadata> = {}
  public readonly sensorConfiguration: SensorConfiguration = {
    health: {
      globalAuthorizer: {
        authorize: 'all',
      },
      magek: DEFAULT_SENSOR_HEALTH_CONFIGURATIONS,
    },
  }

  public globalErrorsHandler: GlobalErrorHandlerMetadata | undefined
  public enableSubscriptions = true

  // TTL for events stored in dispatched events table. Default to 5 minutes (i.e., 300 seconds).
  public dispatchedEventsTtl = 300

  /** Interval in milliseconds between event polling cycles. Default: 1000ms */
  public eventPollingIntervalMs = 1000

  /** Number of events to process per polling cycle. Default: 100 */
  public eventProcessingBatchSize = 100

  public traceConfiguration: TraceConfiguration = {
    enableTraceNotification: false,
    includeInternal: false,
    onStart: async (): Promise<void> => {},
    onEnd: async (): Promise<void> => {},
  }

  public eventStreamConfiguration: EventStreamConfiguration = { enabled: false }

  /** Environment variables to set when running the application */
  public readonly env: Record<string, string> = {}

  /**
   * Add `TokenVerifier` implementations to this array to enable token verification.
   * When a bearer token arrives in a request 'Authorization' header, it will be checked
   * against all the verifiers registered here.
   */
  public tokenVerifiers: Array<TokenVerifier> = []

  public constructor(
    public readonly environmentName: string,
    public readonly registry: MagekRegistry = new MagekRegistry()
  ) {}

  public get resourceNames(): ResourceNames {
    if (this.appName.length === 0) throw new Error('Application name cannot be empty')
    const applicationStackName = this.appName + '-app'
    return {
      applicationStack: applicationStackName,
      eventsStore: applicationStackName + '-events-store',
      dispatchedEventsStore: applicationStackName + '-dispatched-events',
      eventsDedup: applicationStackName + '-events-dedup',
      subscriptionsStore: applicationStackName + '-subscriptions-store',
      connectionsStore: applicationStackName + '-connections-store',
      streamTopic: this.eventStreamConfiguration.parameters?.streamTopic ?? 'magek_events',
      forReadModel(readModelName: string): string {
        return applicationStackName + '-' + readModelName
      },
    }
  }

  /**
   * Returns the name of the ReadModel from the name of its resouce (normally, a table)
   * @param resourceName
   */
  public readModelNameFromResourceName(resourceName: string): string {
    const resourceNamePrefixRegex = new RegExp(`^${this.resourceNames.applicationStack}-`)
    return resourceName.replace(resourceNamePrefixRegex, '')
  }

  /**
   * This is a convenience property to easily check if the application has defined any roles.
   * Only in that case we will create a user pool and an authorization API.
   * If there are no roles defined, it means that all app endpoints are public and users
   * won't be registered (they are all anonymous)
   */
  public get thereAreRoles(): boolean {
    return this.registry.hasRoles()
  }

  public currentVersionFor(className: string): number {
    return this.registry.currentVersionFor(className)
  }

  public validate(): void {
    this.registry.validateSchemaMigrations()
  }

  public get runtime(): Runtime {
    if (!this._runtime)
      throw new Error(
        'It is required to set a runtime implementation (graphQL, api, messaging, scheduled, sensor) in your configuration files'
      )
    return this._runtime
  }

  public set runtime(runtime: Runtime) {
    this._runtime = runtime
  }

  public get userProjectRootPath(): string {
    if (!this._userProjectRootPath)
      throw new Error('Property "userProjectRootPath" is not set. Ensure you have called "Magek.start"')
    return this._userProjectRootPath
  }

  public set userProjectRootPath(path: string) {
    this._userProjectRootPath = path
  }

  public get eventStore(): EventStoreAdapter {
    if (!this.eventStoreAdapter) {
      throw new Error('EventStoreAdapter is not configured. Please set config.eventStoreAdapter.')
    }
    return this.eventStoreAdapter
  }

  public get readModelStore(): ReadModelStoreAdapter {
    if (!this.readModelStoreAdapter) {
      throw new Error('ReadModelStoreAdapter is not configured. Please set config.readModelStoreAdapter.')
    }
    return this.readModelStoreAdapter
  }

  public get sessionStore(): SessionStoreAdapter {
    if (this.enableSubscriptions && !this.sessionStoreAdapter) {
      throw new Error('SessionStoreAdapter is not configured. Please set config.sessionStoreAdapter.')
    }
    return this.sessionStoreAdapter!
  }

  public mustGetEnvironmentVar(varName: string): string {
    const value = process.env[varName]
    if (value == undefined) {
      throw new Error(`Missing environment variable '${varName}'`)
    }
    return value
  }
}


interface ResourceNames {
  applicationStack: string
  eventsStore: string
  dispatchedEventsStore: string
  eventsDedup: string
  subscriptionsStore: string
  connectionsStore: string
  streamTopic: string

  forReadModel(entityName: string): string
}
