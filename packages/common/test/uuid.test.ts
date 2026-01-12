import { UUID } from '../src'
import { expect } from './helpers/expect'

describe('the `UUID` class', () => {
  describe('the generate method', () => {
    it('generates a valid UUIDv7', () => {
      const uuid = UUID.generate()
      
      // UUIDv7 format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(uuid).to.match(uuidRegex)
    })

    it('generates unique identifiers', () => {
      const uuid1 = UUID.generate()
      const uuid2 = UUID.generate()
      
      expect(uuid1).to.not.equal(uuid2)
    })

    it('generates time-ordered identifiers', () => {
      // Generate UUIDs with a small delay to ensure time ordering
      const uuid1 = UUID.generate()
      // Small delay to ensure different timestamp
      const start = Date.now()
      while (Date.now() === start) {
        // Busy wait to ensure time has changed
      }
      const uuid2 = UUID.generate()
      
      // UUIDv7 should be lexicographically sortable
      expect(uuid1.toString() < uuid2.toString()).to.be.true
    })
  })
})
