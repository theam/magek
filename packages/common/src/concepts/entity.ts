/**
 * Holds information about a user class annotated with `@Entity`
 */
import { Class } from '../typelevel.js'
import { UUID } from './uuid.js'
import { EventStreamAuthorizer } from './authorizers.js'

export interface EntityInterface {
  id: UUID
}

export interface EntityMetadata {
  readonly class: Class<EntityInterface>
  readonly eventStreamAuthorizer: EventStreamAuthorizer
}
