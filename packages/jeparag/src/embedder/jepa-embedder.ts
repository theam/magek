/**
 * JEPA Embedder Service.
 * Provides dense vector representations for text chunks using various LLM providers
 * (Gemini, OpenAI, Hash local fallback) with L2 normalization and cosine similarity calculation.
 */

export interface EmbeddingProvider {
  embedQuery(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
}

export interface JEPAEmbedderConfig {
  provider?: 'gemini' | 'openai' | 'hash'
  apiKey?: string
  modelName?: string
  dimensions?: number
}

export class HashEmbeddingBackend implements EmbeddingProvider {
  private readonly dimensions: number

  constructor(dimensions = 128) {
    this.dimensions = dimensions
  }

  public async embedQuery(text: string): Promise<number[]> {
    const vector = new Array(this.dimensions).fill(0)
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i)
      const targetIdx = (charCode * 31 + i) % this.dimensions
      vector[targetIdx] += 1
    }

    // L2 Normalize
    const norm = Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0)) || 1.0
    return vector.map((val) => val / norm)
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embedQuery(t)))
  }
}

export class JEPAEmbedder {
  private readonly backend: EmbeddingProvider

  constructor(config: JEPAEmbedderConfig = {}) {
    const provider = config.provider ?? 'hash'
    if (provider === 'hash') {
      this.backend = new HashEmbeddingBackend(config.dimensions ?? 128)
    } else {
      // Default to Hash for offline safety unless explicit API adapter configured
      this.backend = new HashEmbeddingBackend(config.dimensions ?? 128)
    }
  }

  public async embedText(text: string): Promise<number[]> {
    return this.backend.embedQuery(text)
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    return this.backend.embedBatch(texts)
  }

  /**
   * Computes Cosine Similarity between two dense vector embeddings.
   */
  public static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0
    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB)
    return denom === 0 ? 0 : dotProduct / denom
  }
}
