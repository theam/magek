import { UUID } from '@magek/common'
import { DocumentChunk } from '../loader/pdf-loader'
import { BM25Index } from '../retriever/bm25-index'
import { JEPAEmbedder } from '../embedder/jepa-embedder'
import { ReciprocalRankFusion, FusionResult } from '../retriever/rrf-fusion'
import { ChunkEmbeddedEvent } from './events'

export interface IndexedChunkRecord {
  chunk: DocumentChunk
  embedding: number[]
}

/**
 * Magek ReadModel projection storing hybrid search indices (BM25 + JEPA Dense Embeddings).
 */
export class JeparagHybridSearchReadModel {
  private static readonly chunks: Map<string, IndexedChunkRecord> = new Map()
  private static readonly bm25: BM25Index = new BM25Index()
  private static readonly embedder: JEPAEmbedder = new JEPAEmbedder({ provider: 'hash' })
  private static readonly rrf: ReciprocalRankFusion = new ReciprocalRankFusion(60)

  public constructor(readonly id: UUID) {}

  /**
   * Projects a ChunkEmbeddedEvent into the hybrid search ReadModel.
   */
  public static projectChunkEmbedded(event: ChunkEmbeddedEvent): void {
    const record: IndexedChunkRecord = {
      chunk: {
        id: event.chunkId,
        documentId: event.documentId,
        chunkIndex: event.chunkIndex,
        text: event.text,
        wordCount: event.text.split(' ').length,
      },
      embedding: event.embedding,
    }

    this.chunks.set(event.chunkId, record)
    this.bm25.addDocument(event.chunkId, event.text)
  }

  /**
   * Clears stored chunks in the index (useful for testing or reset).
   */
  public static clear(): void {
    this.chunks.clear()
  }

  /**
   * Queries the ReadModel using BM25 + JEPA Dense Reciprocal Rank Fusion (RRF).
   */
  public static async queryHybrid(queryText: string, topK = 5): Promise<Array<IndexedChunkRecord & { rrfScore: number }>> {
    if (this.chunks.size === 0) return []

    // 1. Sparse BM25 Search
    const sparseResults = this.bm25.search(queryText, topK * 2)

    // 2. Dense JEPA Vector Search
    const queryVector = await this.embedder.embedText(queryText)
    const denseScores: Array<{ id: string; score: number }> = []

    for (const [id, record] of this.chunks.entries()) {
      const sim = JEPAEmbedder.cosineSimilarity(queryVector, record.embedding)
      denseScores.push({ id, score: sim })
    }

    denseScores.sort((a, b) => b.score - a.score)
    const topDense = denseScores.slice(0, topK * 2)

    // 3. Reciprocal Rank Fusion
    const fused: FusionResult[] = this.rrf.fuse(topDense, sparseResults, topK)

    // Map back to records
    const results: Array<IndexedChunkRecord & { rrfScore: number }> = []
    for (const item of fused) {
      const record = this.chunks.get(item.id)
      if (record) {
        results.push({
          ...record,
          rrfScore: item.rrfScore,
        })
      }
    }

    return results
  }
}
