import { GlobalErrorContainer } from './global-error-container.js'
import { EntityInterface, ProjectionMetadata, ReadModelInterface } from '../concepts/index.js'
import { EntitySnapshotEnvelope } from '../envelope.js'

export class ProjectionGlobalError extends GlobalErrorContainer {
  constructor(
    readonly entityEnvelope: EntitySnapshotEnvelope,
    readonly entity: EntityInterface,
    readonly readModel: ReadModelInterface | undefined,
    readonly projectionMetadata: ProjectionMetadata<EntityInterface, ReadModelInterface>,
    originalError: Error
  ) {
    super(originalError)
  }
}
