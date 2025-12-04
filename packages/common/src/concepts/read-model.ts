import { ReadModelAuthorizer, ReadModelFilterHooks, UUID } from '.'
import { Class } from '../typelevel'
import { PropertyMetadata } from '../metadata-types'

export interface MagekMetadata {
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
  magekMetadata?: MagekMetadata
   
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
