/**
 * Reciprocal Rank Fusion (RRF) Hybrid Retriever.
 * Combines dense vector similarity scores (JEPA) with sparse keyword scores (BM25)
 * into a single unified relevance ranking.
 */

export interface RankedItem {
  id: string
  score: number
  metadata?: Record<string, unknown>
}

export interface FusionResult {
  id: string
  rrfScore: number
  denseRank: number
  sparseRank: number
}

export class ReciprocalRankFusion {
  private readonly k: number

  constructor(k = 60) {
    this.k = k
  }

  /**
   * Merges dense vector ranks and sparse BM25 ranks using RRF.
   * RRF_score(doc) = 1 / (k + rank_dense) + 1 / (k + rank_sparse)
   */
  public fuse(denseResults: RankedItem[], sparseResults: RankedItem[], topK = 10): FusionResult[] {
    const rrfScores = new Map<string, { rrfScore: number; denseRank: number; sparseRank: number }>()

    // Process dense rankings (1-indexed rank)
    denseResults.forEach((item, index) => {
      const rank = index + 1
      const current = rrfScores.get(item.id) ?? { rrfScore: 0, denseRank: 9999, sparseRank: 9999 }
      current.denseRank = rank
      current.rrfScore += 1 / (this.k + rank)
      rrfScores.set(item.id, current)
    })

    // Process sparse rankings (1-indexed rank)
    sparseResults.forEach((item, index) => {
      const rank = index + 1
      const current = rrfScores.get(item.id) ?? { rrfScore: 0, denseRank: 9999, sparseRank: 9999 }
      current.sparseRank = rank
      current.rrfScore += 1 / (this.k + rank)
      rrfScores.set(item.id, current)
    })

    return Array.from(rrfScores.entries())
      .map(([id, val]) => ({
        id,
        rrfScore: val.rrfScore,
        denseRank: val.denseRank,
        sparseRank: val.sparseRank,
      }))
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, topK)
  }
}
