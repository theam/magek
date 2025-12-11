import {
  createInstance,
  MagekConfig,
  Class,
  EntityInterface,
  EventDeleteParameters,
  EventSearchParameters,
  EventSearchResponse,
  PaginatedEntitiesIdsResult,
  ReadModelInterface,
  Searcher,
  UUID,
} from '@magek/common'
import { Importer } from './importer'
import { EventStore } from './services/event-store'
import { MagekEntityMigrated } from './core-concepts/data-migration/events/entity-migrated'
import { MagekDataMigrationEntity } from './core-concepts/data-migration/entities/data-migration-entity'
import { MagekDataMigrationStarted } from './core-concepts/data-migration/events/data-migration-started'
import { MagekDataMigrationFinished } from './core-concepts/data-migration/events/data-migration-finished'
import { MagekAuthorizer } from './authorizer'
import { MagekEntityTouched } from './core-concepts/touch-entity/events/entity-touched'
import { readModelSearcher } from './services/read-model-searcher'
import { MagekDeleteEventDispatcher } from './delete-event-dispatcher'
import { eventSearch } from './event-search'
import { Effect, pipe } from 'effect'
import { Command } from '@effect/cli'
import * as path from 'path'
import * as Injectable from './injectable'
import { NodeContext, NodeRuntime } from '@effect/platform-node'

/**
 * Main class to interact with Magek and configure it.
 * Sensible defaults are used whenever possible:
 * - `provider`: `Provider.AWS`
 * - `appName`: `new-magek-app`
 * - `region`: 'eu-west-1'
 *
 */
export class Magek {
  public static readonly configuredEnvironments: Set<string> = new Set<string>()
  public static readonly config = new MagekConfig(checkAndGetCurrentEnv())

  public static configureCurrentEnv(configurator: (config: MagekConfig) => void): void {
    configurator(this.config)
  }

  /**
   * Allows to configure the Magek project.
   *
   * @param environment The name of the environment you want to configure
   * @param configurator A function that receives the configuration object to set the values
   */
  public static configure(environment: string, configurator: (config: MagekConfig) => void): void {
    this.configuredEnvironments.add(environment)
    if (this.config.environmentName === environment) {
      configurator(this.config)
    }
  }

  /**
   * Initializes the Magek project
   */
  public static start(codeRootPath: string): void {
    if (!this.config.eventStoreAdapter) {
      throw new Error('No eventStoreAdapter configured. Please add one in MagekConfig.')
    }
    if (!this.config.readModelStoreAdapter) {
      throw new Error('No readModelStoreAdapter configured. Please add one in MagekConfig.')
    }
    if (this.config.enableSubscriptions && !this.config.sessionStoreAdapter) {
      throw new Error('No sessionStoreAdapter configured. Please add one in MagekConfig.')
    }
    const projectRootPath = codeRootPath.replace(new RegExp(this.config.codeRelativePath + '$'), '')
    this.config.userProjectRootPath = projectRootPath
    Importer.importUserProjectFiles(codeRootPath)
    this.configureMagekConcepts()
    this.config.validate()
    const args = process.argv
    if (process.env['MAGEK_CLI_HOOK']?.trim() !== 'true') {
      return
    }
    const injectable = this.config.injectable
    if (injectable) {
      const { commands, runMain, contextProvider } = injectable as Injectable.Injectable
      const provider = contextProvider ?? NodeContext.layer
      const runner = runMain ?? NodeRuntime.runMain
      const name = 'boost'
      const version = require(path.join(projectRootPath, 'package.json')).version
      const command = Command.make('boost').pipe(Command.withSubcommands(commands))
      // Run the generated CLI
      pipe(
        args,
        Command.run(command, {
          name,
          version,
        }),
        // TODO: Improve error messages
        Effect.provide(provider),
        runner
      )
    }
  }

  /**
   * This function returns a "Searcher" configured to search instances of the read model class passed as param.
   * For more information, check the Searcher class.
   * @param readModelClass The class of the read model you what to run searches for
   */
  public static readModel<TReadModel extends ReadModelInterface>(
    readModelClass: Class<TReadModel>
  ): Searcher<TReadModel> {
    return readModelSearcher(this.config, readModelClass)
  }

  public static async events(request: EventSearchParameters): Promise<Array<EventSearchResponse>> {
    return eventSearch(this.config, request)
  }

  public static async entitiesIDs(
    entityTypeName: string,
    limit: number,
    afterCursor?: Record<string, string>
  ): Promise<PaginatedEntitiesIdsResult> {
    return await this.config.eventStore.searchEntitiesIDs(this.config, limit, afterCursor, entityTypeName)
  }

  public static async deleteEvent(parameters: EventDeleteParameters): Promise<boolean> {
    return await MagekDeleteEventDispatcher.deleteEvent(this.config, parameters)
  }

  /**
   * Fetches the last known version of an entity
   * @param entityClass Name of the entity class
   * @param entityID
   */
  public static async entity<TEntity extends EntityInterface>(
    entityClass: Class<TEntity>,
    entityID: UUID
  ): Promise<TEntity | undefined> {
    const eventStore = new EventStore(this.config)
    const entitySnapshotEnvelope = await eventStore.fetchEntitySnapshot(entityClass.name, entityID)
    return entitySnapshotEnvelope ? createInstance(entityClass, entitySnapshotEnvelope.value) : undefined
  }

  private static configureMagekConcepts(): void {
    this.configureDataMigrations()
    this.configureTouchEntities()
  }

  private static configureDataMigrations(): void {
    this.config.events[MagekEntityMigrated.name] = {
      class: MagekEntityMigrated,
    }

    this.config.events[MagekDataMigrationStarted.name] = {
      class: MagekDataMigrationStarted,
    }

    this.config.reducers[MagekDataMigrationStarted.name] = {
      class: MagekDataMigrationEntity,
      methodName: 'started',
    }

    this.config.events[MagekDataMigrationFinished.name] = {
      class: MagekDataMigrationFinished,
    }

    this.config.reducers[MagekDataMigrationFinished.name] = {
      class: MagekDataMigrationEntity,
      methodName: 'finished',
    }

    this.config.entities[MagekDataMigrationEntity.name] = {
      class: MagekDataMigrationEntity,
      eventStreamAuthorizer: MagekAuthorizer.denyAccess,
    }
  }

  private static configureTouchEntities(): void {
    this.config.events[MagekEntityTouched.name] = {
      class: MagekEntityTouched,
    }
  }

}

function checkAndGetCurrentEnv(): string {
  const env = process.env.MAGEK_ENV
  if (!env || env.trim().length == 0) {
    throw new Error(
      'Magek environment is missing. You need to provide an environment to configure your Magek project'
    )
  }
  return env
}
