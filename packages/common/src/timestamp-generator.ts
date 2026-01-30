/**
 * Generates unique, monotonically increasing ISO 8601 timestamps with sub-millisecond precision.
 *
 * Format: 2024-01-28T12:34:56.12345678Z where:
 * - Digits 1-3 (123): actual milliseconds from Date.now()
 * - Digits 4-7 (4567): monotonic counter (0000-9999)
 * - Digit 8 (8): random seed for distributed uniqueness (0-9)
 *
 * This provides:
 * - 10,000 unique orderable timestamps per millisecond per instance
 * - 100,000 total combinations across distributed instances (10,000 counter values × 10 seeds)
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
   * @returns ISO 8601 timestamp string with 8 fractional digits
   */
  public next(): string {
    const nowMs = Date.now()

    // Reset counter only if we've moved forward to a new millisecond
    // When nowMs <= lastMs (clock skew), continue using lastMs and incrementing counter
    if (nowMs > this.lastMs) {
      this.lastMs = nowMs
      this.counter = 0
    }

    // If counter exceeds 9999, advance lastMs to maintain monotonicity
    if (this.counter > 9999) {
      this.lastMs++
      this.counter = 0
    }

    // Format: milliseconds (3 digits) + counter (4 digits) + seed (1 digit)
    const microPart = String(this.counter).padStart(4, '0') + String(this.randomSeed)
    this.counter++

    // Build ISO 8601 timestamp with microsecond precision
    // Use lastMs (which may be clamped due to clock skew) instead of nowMs
    const date = new Date(this.lastMs)
    const isoString = date.toISOString()
    
    // Replace milliseconds with our extended precision
    // ISO format: 2024-01-28T12:34:56.123Z
    //                                    ^^^
    // We extend to: 2024-01-28T12:34:56.12345678Z
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
