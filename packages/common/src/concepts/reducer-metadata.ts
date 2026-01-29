import { AnyClass } from '..'
import { EntityInterface } from './entity'

export interface ReducerMetadata {
  class: AnyClass
  methodName: string
}

export enum ReducerAction {
  Skip,
}

export type ReducerResult<TEntity extends EntityInterface> = TEntity | ReducerAction
