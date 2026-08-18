/**
 * Document Chunking and Text Preprocessing Utility for Jeparag.
 * Handles text extraction, tokenization, header/footer cleanup, and sliding-window chunking.
 */

export interface DocumentChunk {
  id: string
  documentId: string
  chunkIndex: number
  text: string
  wordCount: number
  metadata?: Record<string, unknown>
}

export interface ChunkingOptions {
  chunkSize?: number
  chunkOverlap?: number
  cleanHeadersFooters?: boolean
}

export class DocumentLoader {
  /**
   * Cleans raw text input by normalizing whitespace and removing garbage control characters.
   */
  public static cleanText(text: string): string {
    if (!text) return ''
    return text
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F]/g, '')
      .trim()
  }

  /**
   * Splits raw text into sliding window chunks preserving word boundaries.
   * Default chunkSize: 256 words, chunkOverlap: 50 words.
   */
  public static chunkText(
    documentId: string,
    rawText: string,
    options: ChunkingOptions = {}
  ): DocumentChunk[] {
    const chunkSize = options.chunkSize ?? 256
    const chunkOverlap = options.chunkOverlap ?? 50
    const cleanedText = this.cleanText(rawText)

    if (!cleanedText) {
      return []
    }

    const words = cleanedText.split(' ')
    if (words.length === 0) {
      return []
    }

    const chunks: DocumentChunk[] = []
    let step = chunkSize - chunkOverlap
    if (step <= 0) step = chunkSize

    let index = 0
    for (let i = 0; i < words.length; i += step) {
      const slice = words.slice(i, i + chunkSize)
      if (slice.length === 0) break

      const chunkText = slice.join(' ')
      chunks.push({
        id: `${documentId}-chunk-${index}`,
        documentId,
        chunkIndex: index,
        text: chunkText,
        wordCount: slice.length,
      })

      index++
      if (i + chunkSize >= words.length) break
    }

    return chunks
  }
}
