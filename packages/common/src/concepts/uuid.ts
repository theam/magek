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
