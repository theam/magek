import { Magek } from '../magek'
import {
  AnyClass,
  Class,
  EntityInterface,
  ProjectionInfo,
  ProjectionMetadata,
  ProjectionResult,
  ReadModelInterface,
  ReadModelJoinKeyFunction,
  UUID,
} from '@magek/common'

type PropertyType<TObj, TProp extends keyof TObj> = TObj[TProp]
type JoinKeyType<TEntity extends EntityInterface, TReadModel extends ReadModelInterface> =
  | keyof TEntity
  | ReadModelJoinKeyFunction<TEntity, TReadModel>

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
 * Decorator to register a read model method as a projection
 * for a specific entity.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * @param originEntity The entity that this method will react to
 * @param joinKey
 * @param unProject
 */
export function projects<
  TEntity extends EntityInterface,
  TJoinKey extends keyof TEntity,
  TReadModel extends ReadModelInterface
>(
  originEntity: Class<TEntity>,
  joinKey: JoinKeyType<TEntity, TReadModel>,
  unProject?: UnprojectionMethod<TEntity, TReadModel, PropertyType<TEntity, TJoinKey>>
): <TReceivedReadModel extends ReadModelInterface>(
  method: Function,
  context: Stage3MethodContext
) => void {
  return (_method, context) => {
    // Stage 3 decorator - use addInitializer to get the class
    if (context.addInitializer) {
      context.addInitializer(function (this: Function) {
        const readModelClass = context.static ? (this as AnyClass) : (this.constructor as AnyClass)
        const projectionMetadata = {
          joinKey: joinKey,
          class: readModelClass,
          methodName: context.name.toString(),
        } as ProjectionMetadata<EntityInterface, ReadModelInterface>
        registerProjection(originEntity.name, projectionMetadata)
        if (unProject) {
          const unProjectionMetadata = {
            joinKey,
            class: readModelClass,
            methodName: unProject.name,
          } as ProjectionMetadata<EntityInterface, ReadModelInterface>
          registerUnProjection(originEntity.name, unProjectionMetadata)
        }
      })
    }
  }
}

function registerProjection(
  originName: string,
  projectionMetadata: ProjectionMetadata<EntityInterface, ReadModelInterface>
): void {
  Magek.configureCurrentEnv((config): void => {
    configure(originName, projectionMetadata, config.projections)
  })
}

function registerUnProjection(
  originName: string,
  projectionMetadata: ProjectionMetadata<EntityInterface, ReadModelInterface>
): void {
  Magek.configureCurrentEnv((config): void => {
    configure(originName, projectionMetadata, config.unProjections)
  })
}

function configure(
  originName: string,
  projectionMetadata: ProjectionMetadata<EntityInterface, ReadModelInterface>,
  configuration: Record<string, Array<ProjectionMetadata<EntityInterface, ReadModelInterface>>>
): void {
  const entityProjections = configuration[originName] || []
  if (entityProjections.indexOf(projectionMetadata) < 0) {
    // Skip duplicate registrations
    entityProjections.push(projectionMetadata)
    configuration[originName] = entityProjections
  }
}

type ProjectionMethodDefinitionForArray<TEntity, TReadModel> = (
  _: TEntity,
  readModelID: UUID,
  readModel?: TReadModel,
  projectionInfo?: ProjectionInfo
) => ProjectionResult<TReadModel>

type ProjectionMethodDefinition<TEntity, TReadModel> = (
  _: TEntity,
  readModel?: TReadModel,
  projectionInfo?: ProjectionInfo
) => ProjectionResult<TReadModel>

type UnprojectionMethod<TEntity, TReadModel, TPropType> = TPropType extends Array<UUID>
  ? ProjectionMethodDefinitionForArray<TEntity, TReadModel>
  : ProjectionMethodDefinition<TEntity, TReadModel>

// Re-export with PascalCase alias for backward compatibility during migration
// TODO: Remove this alias after all usages have been updated to @projects
export { projects as Projects }
