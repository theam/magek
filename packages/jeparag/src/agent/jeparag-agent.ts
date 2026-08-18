import { DocumentLoader } from '../loader/pdf-loader'
import { JEPAEmbedder } from '../embedder/jepa-embedder'
import { DocumentIngestedEvent, ChunkEmbeddedEvent, JeparagQueryProcessedEvent } from '../concepts/events'
import { JeparagHybridSearchReadModel } from '../concepts/read-model'

export interface AgentQueryResult {
  queryId: string
  query: string
  answer: string
  contextChunks: string[]
  rrfScores: number[]
}

/**
 * Magek Ambient Agent for Jeparag.
 * Reacts asynchronously to document ingestion events, indexes chunks in ReadModels,
 * and handles contextual RAG generation queries.
 */
export class JeparagAmbientAgent {
  private readonly embedder: JEPAEmbedder

  constructor(embedderProvider: 'gemini' | 'openai' | 'hash' = 'hash') {
    this.embedder = new JEPAEmbedder({ provider: embedderProvider })
  }

  /**
   * Reaction handler when a DocumentIngestedEvent occurs in the system stream.
   * Splits document into chunks, embeds them, and registers them into the hybrid ReadModel.
   */
  public async onDocumentIngested(event: DocumentIngestedEvent): Promise<ChunkEmbeddedEvent[]> {
    const chunks = DocumentLoader.chunkText(event.documentId, event.rawText, {
      chunkSize: 256,
      chunkOverlap: 50,
    })

    const events: ChunkEmbeddedEvent[] = []

    for (const chunk of chunks) {
      const embedding = await this.embedder.embedText(chunk.text)
      const embeddedEvent = new ChunkEmbeddedEvent(
        chunk.id,
        chunk.documentId,
        chunk.chunkIndex,
        chunk.text,
        embedding
      )

      // Project into Magek ReadModel
      JeparagHybridSearchReadModel.projectChunkEmbedded(embeddedEvent)
      events.push(embeddedEvent)
    }

    return events
  }

  /**
   * Processes a user/agent query against the indexed corpus using RRF Hybrid search.
   */
  public async processQuery(queryId: string, queryText: string, topK = 5): Promise<JeparagQueryProcessedEvent> {
    const searchResults = await JeparagHybridSearchReadModel.queryHybrid(queryText, topK)

    const contextTexts = searchResults.map((r) => r.chunk.text)
    const contextIds = searchResults.map((r) => r.chunk.id)

    // Build RAG answer synthesis
    const answer = this.synthesizeAnswer(queryText, contextTexts)

    return new JeparagQueryProcessedEvent(queryId, queryText, contextIds, answer)
  }

  private synthesizeAnswer(query: string, contexts: string[]): string {
    if (contexts.length === 0) {
      return `No relevant context found for query: "${query}".`
    }

    const compiledContext = contexts.map((ctx, i) => `[Context ${i + 1}]: ${ctx}`).join('\n\n')
    return `[Jeparag RAG Answer]\nBased on ${contexts.length} retrieved context passages:\n\n${compiledContext}`
  }
}
