/**
 * Okapi BM25 Sparse Keyword Indexing Engine for Jeparag.
 * Implements TF-IDF / Okapi BM25 ranking algorithm with configurable k1 and b parameters.
 */

export interface BM25Document {
  id: string
  text: string
}

export interface BM25SearchResult {
  id: string
  score: number
}

export class BM25Index {
  private readonly k1: number
  private readonly b: number
  private documents: Map<string, string> = new Map()
  private docLengths: Map<string, number> = new Map()
  private termFrequencies: Map<string, Map<string, number>> = new Map()
  private docFrequencies: Map<string, number> = new Map()
  private avgDocLength = 0

  constructor(k1 = 1.2, b = 0.75) {
    this.k1 = k1
    this.b = b
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((term) => term.length > 0)
  }

  public addDocument(id: string, text: string): void {
    const tokens = this.tokenize(text)
    this.documents.set(id, text)
    this.docLengths.set(id, tokens.length)

    const tfMap = new Map<string, number>()
    const uniqueTerms = new Set<string>()

    for (const token of tokens) {
      tfMap.set(token, (tfMap.get(token) ?? 0) + 1)
      uniqueTerms.add(token)
    }

    this.termFrequencies.set(id, tfMap)

    for (const term of uniqueTerms) {
      this.docFrequencies.set(term, (this.docFrequencies.get(term) ?? 0) + 1)
    }

    // Recalculate average document length
    let totalLength = 0
    for (const len of this.docLengths.values()) {
      totalLength += len
    }
    this.avgDocLength = this.docLengths.size > 0 ? totalLength / this.docLengths.size : 0
  }

  public search(query: string, topK = 10): BM25SearchResult[] {
    const queryTokens = this.tokenize(query)
    const numDocs = this.documents.size
    if (numDocs === 0 || queryTokens.length === 0) return []

    const scores = new Map<string, number>()

    for (const [docId, tfMap] of this.termFrequencies.entries()) {
      const docLen = this.docLengths.get(docId) ?? 0
      let score = 0

      for (const token of queryTokens) {
        const tf = tfMap.get(token) ?? 0
        if (tf === 0) continue

        const df = this.docFrequencies.get(token) ?? 0
        // Okapi BM25 IDF formula
        const idf = Math.log((numDocs - df + 0.5) / (df + 0.5) + 1.0)
        const numerator = tf * (this.k1 + 1)
        const denominator = tf + this.k1 * (1 - this.b + (this.b * docLen) / (this.avgDocLength || 1))

        score += idf * (numerator / denominator)
      }

      if (score > 0) {
        scores.set(docId, score)
      }
    }

    return Array.from(scores.entries())
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }
}
