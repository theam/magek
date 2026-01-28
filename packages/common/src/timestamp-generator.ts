/**
 * Generates unique, monotonically increasing ISO 8601 timestamps with sub-millisecond precision.
 * 
 * Format: 2024-01-28T12:34:56.123456Z where:
 * - Digits 1-3 (123): actual milliseconds from Date.now()
 * - Digits 4-5 (45): monotonic counter (00-99)
 * - Digit 6 (6): random seed for distributed uniqueness (0-9)
 * 
 * This provides:
 * - 100 unique orderable timestamps per millisecond per instance
 * - 1000 total combinations across distributed instances (100 counter values × 10 seeds)
 * - Standard ISO 8601 format parseable by any Date library
 * - Deterministic ordering via string comparison
 * - Random component for distributed uniqueness
 */
export class TimestampGenerator {
  private lastMs = 0
  private counter = 0
  private readonly randomSeed: number

  constructor() {
    // Generate random seed 0-9 for distributed uniqueness
    this.randomSeed = Math.floor(Math.random() * 10)
  }

  /**
   * Generates the next unique timestamp with microsecond precision.
   * 
   * @returns ISO 8601 timestamp string with 6 fractional digits
   */
  public next(): string {
    const nowMs = Date.now()

    // Reset counter if we've moved to a new millisecond
    if (nowMs !== this.lastMs) {
      this.lastMs = nowMs
      this.counter = 0
    }

    // If counter exceeds 99, we've exhausted this millisecond's capacity
    if (this.counter > 99) {
      // Wait for next millisecond
      while (Date.now() === this.lastMs) {
        // Busy wait (sub-millisecond precision unavailable in JS)
      }
      return this.next()
    }

    // Format: milliseconds (3 digits) + counter (2 digits) + seed (1 digit)
    const microPart = String(this.counter).padStart(2, '0') + String(this.randomSeed)
    this.counter++

    // Build ISO 8601 timestamp with microsecond precision
    const date = new Date(nowMs)
    const isoString = date.toISOString()
    
    // Replace milliseconds with our extended precision
    // ISO format: 2024-01-28T12:34:56.123Z
    //                                    ^^^
    // We extend to: 2024-01-28T12:34:56.123456Z
    const withMicros = isoString.slice(0, -1) + microPart + 'Z'
    
    return withMicros
  }
}

/**
 * Global singleton instance of TimestampGenerator.
 */
let timestampGeneratorInstance: TimestampGenerator | undefined

/**
 * Returns the singleton TimestampGenerator instance.
 * Creates it if it doesn't exist yet.
 * 
 * @returns The global TimestampGenerator instance
 */
export function getTimestampGenerator(): TimestampGenerator {
  if (!timestampGeneratorInstance) {
    timestampGeneratorInstance = new TimestampGenerator()
  }
  return timestampGeneratorInstance
}

/**
 * Resets the singleton instance. Primarily for testing purposes.
 */
export function resetTimestampGenerator(): void {
  timestampGeneratorInstance = undefined
}
