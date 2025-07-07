import { Class } from '../typelevel.js'
import { UUID } from './uuid.js'
import { PropertyMetadata } from '@booster-ai/metadata'
import { ReadModelAuthorizer } from './authorizers.js'
import { ReadModelFilterHooks } from './filter-hooks.js'

export interface BoosterMetadata {
  version: number
  schemaVersion: number
  optimisticConcurrencyValue?: string | number
  lastUpdateAt?: string
  lastProjectionInfo?: {
    entityId: string
    entityName: string
    entityUpdatedAt: string
    projectionMethod: string
  }
}

export interface ReadModelInterface {
  id: UUID
  boosterMetadata?: BoosterMetadata
   
  [key: string]: any
}

export interface ReadModelMetadata<TReadModel extends ReadModelInterface = ReadModelInterface> {
  readonly class: Class<ReadModelInterface>
  readonly properties: Array<PropertyMetadata>
  readonly authorizer: ReadModelAuthorizer
  readonly before: NonNullable<ReadModelFilterHooks<TReadModel>['before']>
}

export enum ProjectionInfoReason {
  ENTITY_PROJECTED,
  ENTITY_DELETED,
}

export interface ProjectionInfo {
  reason: ProjectionInfoReason
}
