import { v7 as uuid } from 'uuid'
/**
 * `UUID` type to work globally as a identifier for Entities,
 * Commands, Events or any other magek artifact.
 * New unique identifiers can be created using the
 * `UUID.generate` method.
 * 
 * Uses UUIDv7 which provides time-ordered, lexicographically sortable identifiers
 * as per RFC 9562.
 */
export class UUID extends String {
  public static generate(): UUID {
    return uuid()
  }
}
