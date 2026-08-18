import { UUID } from '@magek/common'

/**
 * Immutable Event emitted when a document is ingested into the system.
 */
export class DocumentIngestedEvent {
  readonly timestamp: string

  public constructor(
    readonly documentId: string,
    readonly title: string,
    readonly rawText: string,
    timestamp?: string
  ) {
    this.timestamp = timestamp ?? new Date().toISOString()
  }

  public entityID(): UUID {
    return this.documentId
  }
}

/**
 * Immutable Event emitted when a chunk has been generated and embedded.
 */
export class ChunkEmbeddedEvent {
  readonly timestamp: string

  public constructor(
    readonly chunkId: string,
    readonly documentId: string,
    readonly chunkIndex: number,
    readonly text: string,
    readonly embedding: number[],
    timestamp?: string
  ) {
    this.timestamp = timestamp ?? new Date().toISOString()
  }

  public entityID(): UUID {
    return this.chunkId
  }
}

/**
 * Immutable Event emitted when a Jeparag RAG query is executed by an Ambient Agent.
 */
export class JeparagQueryProcessedEvent {
  readonly timestamp: string

  public constructor(
    readonly queryId: string,
    readonly queryText: string,
    readonly retrievedChunkIds: string[],
    readonly answer: string,
    timestamp?: string
  ) {
    this.timestamp = timestamp ?? new Date().toISOString()
  }

  public entityID(): UUID {
    return this.queryId
  }
}
