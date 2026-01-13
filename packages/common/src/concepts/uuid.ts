import { v7 as uuid } from 'uuid'
/**
 * `UUID` type to work globally as a identifier for Entities,
 * Commands, Events or any other magek artifact.
 * New unique identifiers can be created using the
 * `UUID.generate` method.
 * 
 * Uses UUIDv7 (RFC 9562) which provides time-ordering and
 * lexicographic sortability with sub-millisecond precision.
 */
export class UUID extends String {
  public static generate(): UUID {
    return uuid()
  }
}

/**
 * @deprecated Use UUID instead. UUIDv7 provides time-ordering by design.
 * Time-based unique identifier. It's a string in the form <timestamp>-<random UUID>.
 * This class is kept for backward compatibility but should not be used in new code.
 */
export class TimeKey extends String {
  /**
   * @deprecated Use UUID.generate() instead. UUIDv7 provides time-ordering by design.
   * Time-based unique identifier generator
   * @param moment Number of milliseconds since epoch for the moment in which the identifier should be generated. It defaults to the current time.
   * @returns A unique identifier in the form "<moment>-<random UUID>"
   */
  public static generate(moment = Date.now()): TimeKey {
    // For backward compatibility, we now generate a UUIDv7
    // UUIDv7 already includes timestamp information and is time-ordered
    return uuid() as TimeKey
  }
}
