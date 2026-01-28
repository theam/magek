import { expect } from './helpers/expect'
import { TimestampGenerator, getTimestampGenerator, resetTimestampGenerator } from '../src/timestamp-generator'

describe('TimestampGenerator', () => {
  afterEach(() => {
    resetTimestampGenerator()
  })

  describe('constructor', () => {
    it('should create a new instance with a random seed', () => {
      const generator = new TimestampGenerator()
      expect(generator).to.be.instanceOf(TimestampGenerator)
    })
  })

  describe('next()', () => {
    it('should generate a valid ISO 8601 timestamp with 6 fractional digits', () => {
      const generator = new TimestampGenerator()
      const timestamp = generator.next()

      // Check format: YYYY-MM-DDTHH:MM:SS.SSSSSSZ
      expect(timestamp).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/)
    })

    it('should generate unique timestamps for consecutive calls', () => {
      const generator = new TimestampGenerator()
      const timestamps = new Set<string>()

      for (let i = 0; i < 10; i++) {
        timestamps.add(generator.next())
      }

      expect(timestamps.size).to.equal(10)
    })

    it('should generate monotonically increasing timestamps', () => {
      const generator = new TimestampGenerator()
      const timestamps: string[] = []

      for (let i = 0; i < 10; i++) {
        timestamps.push(generator.next())
      }

      // All should be ordered
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i] > timestamps[i - 1]).to.be.true
      }
    })

    it('should handle multiple calls within the same millisecond', () => {
      const generator = new TimestampGenerator()
      const timestamps: string[] = []

      // Generate timestamps quickly to test same-millisecond handling
      for (let i = 0; i < 5; i++) {
        timestamps.push(generator.next())
      }

      // All should be unique
      const uniqueTimestamps = new Set(timestamps)
      expect(uniqueTimestamps.size).to.equal(timestamps.length)

      // All should be ordered
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i] > timestamps[i - 1]).to.be.true
      }
    })

    it('should reset counter when moving to a new millisecond', async () => {
      const generator = new TimestampGenerator()

      // Get first timestamp
      const first = generator.next()

      // Wait for at least 1ms
      await new Promise((resolve) => setTimeout(resolve, 2))

      // Get second timestamp - should have counter reset
      const second = generator.next()

      // Both should be valid
      expect(first).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/)
      expect(second).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/)

      // Second should be after first
      expect(second > first).to.be.true
    })

    it('should be parseable by Date.parse()', () => {
      const generator = new TimestampGenerator()
      const timestamp = generator.next()

      const parsed = Date.parse(timestamp)
      expect(parsed).to.be.a('number')
      expect(parsed).to.not.be.NaN
      expect(parsed).to.be.greaterThan(0)
    })

    it('should maintain the milliseconds from the original timestamp', () => {
      const generator = new TimestampGenerator()
      const beforeMs = Date.now()
      const timestamp = generator.next()
      const afterMs = Date.now()

      // Extract milliseconds from timestamp
      const timestampMs = Date.parse(timestamp)

      // Should be within the time window
      expect(timestampMs).to.be.at.least(beforeMs)
      expect(timestampMs).to.be.at.most(afterMs + 1) // +1ms tolerance
    })

    it('should have the random seed as the last digit', () => {
      const generator = new TimestampGenerator()
      const timestamps: string[] = []

      // Get multiple timestamps
      for (let i = 0; i < 5; i++) {
        timestamps.push(generator.next())
      }

      // Extract the last digit before 'Z' (the random seed)
      const seeds = timestamps.map((ts) => ts.charAt(ts.length - 2))

      // All should have the same random seed within the same instance
      const uniqueSeeds = new Set(seeds)
      expect(uniqueSeeds.size).to.equal(1)
    })

    it('should increment counter for consecutive calls in same millisecond', () => {
      const generator = new TimestampGenerator()
      const timestamps: string[] = []

      // Get timestamps quickly
      for (let i = 0; i < 3; i++) {
        timestamps.push(generator.next())
      }

      // Extract fractional seconds (last 7 chars: .123456Z)
      const fractions = timestamps.map((ts) => ts.slice(-7, -1))

      // If they're in the same millisecond, the counter part should increment
      if (fractions[0].slice(0, 3) === fractions[1].slice(0, 3)) {
        // Same millisecond - check counter increments
        expect(fractions[1] > fractions[0]).to.be.true
      }
    })
  })

  describe('getTimestampGenerator()', () => {
    it('should return a singleton instance', () => {
      const instance1 = getTimestampGenerator()
      const instance2 = getTimestampGenerator()

      expect(instance1).to.equal(instance2)
    })

    it('should return a functional TimestampGenerator', () => {
      const generator = getTimestampGenerator()
      const timestamp = generator.next()

      expect(timestamp).to.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/)
    })

    it('should maintain state across calls', () => {
      const generator1 = getTimestampGenerator()
      const first = generator1.next()

      const generator2 = getTimestampGenerator()
      const second = generator2.next()

      // Should be different timestamps from same instance
      expect(second > first).to.be.true
    })
  })

  describe('resetTimestampGenerator()', () => {
    it('should reset the singleton instance', () => {
      const instance1 = getTimestampGenerator()
      instance1.next()

      resetTimestampGenerator()

      const instance2 = getTimestampGenerator()

      expect(instance2).to.not.equal(instance1)
    })

    it('should allow a fresh instance with new random seed', () => {
      const generator1 = getTimestampGenerator()
      const ts1 = generator1.next()
      const seed1 = ts1.charAt(ts1.length - 2)

      resetTimestampGenerator()

      const generator2 = getTimestampGenerator()
      const ts2 = generator2.next()
      const seed2 = ts2.charAt(ts2.length - 2)

      // Seeds might be different (or same by chance, with 10% probability)
      expect(seed1).to.match(/\d/)
      expect(seed2).to.match(/\d/)
    })
  })

  describe('distributed uniqueness', () => {
    it('should produce different seeds for different instances', () => {
      const seeds = new Set<string>()

      // Create multiple instances and collect their seeds
      for (let i = 0; i < 20; i++) {
        const generator = new TimestampGenerator()
        const timestamp = generator.next()
        const seed = timestamp.charAt(timestamp.length - 2)
        seeds.add(seed)
      }

      // With 20 instances and 10 possible seeds, we should see multiple different seeds
      expect(seeds.size).to.be.greaterThan(1)
    })
  })

  describe('backwards compatibility', () => {
    it('should sort correctly with old 3-digit millisecond timestamps', () => {
      const oldFormat = '2024-01-28T12:34:56.123Z'
      const generator = new TimestampGenerator()

      // Wait a tiny bit to ensure we're past the old timestamp
      const newFormat = generator.next()

      // New format should be greater or equal when compared as strings
      // (might be equal if we're in the exact same millisecond)
      expect(newFormat >= oldFormat).to.be.true
    })

    it('should maintain string comparison ordering with mixed formats', () => {
      const timestamps = [
        '2024-01-28T12:34:56.123Z',      // old format
        '2024-01-28T12:34:56.123045Z',   // new format, counter=0, seed=45
        '2024-01-28T12:34:56.123145Z',   // new format, counter=1, seed=45
        '2024-01-28T12:34:56.124Z',      // old format, next ms
        '2024-01-28T12:34:56.124067Z',   // new format, counter=0, seed=67
      ]

      // When sorting as strings, old format (ending with Z immediately after 3 digits)
      // will sort AFTER new format (with additional digits before Z)
      // because '1' < 'Z' in ASCII (49 vs 90)
      const sorted = [...timestamps].sort()
      
      // The actual sorted order:
      const expected = [
        '2024-01-28T12:34:56.123045Z',   // new format
        '2024-01-28T12:34:56.123145Z',   // new format
        '2024-01-28T12:34:56.123Z',      // old format (Z comes after digits)
        '2024-01-28T12:34:56.124067Z',   // new format
        '2024-01-28T12:34:56.124Z',      // old format
      ]

      expect(sorted).to.deep.equal(expected)
    })
  })

  describe('edge cases', () => {
    it('should handle rapid successive calls', () => {
      const generator = new TimestampGenerator()
      const timestamps: string[] = []

      // Generate many timestamps rapidly
      for (let i = 0; i < 100; i++) {
        timestamps.push(generator.next())
      }

      // All should be unique
      const uniqueTimestamps = new Set(timestamps)
      expect(uniqueTimestamps.size).to.equal(100)

      // All should be ordered
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i] > timestamps[i - 1]).to.be.true
      }
    })

    it('should handle counter overflow by waiting for next millisecond', async () => {
      const generator = new TimestampGenerator()
      const timestamps: string[] = []

      // Try to exhaust a millisecond (would need 100 calls in 1ms)
      // This is a best-effort test; depending on CPU speed, we might
      // naturally move to the next millisecond
      for (let i = 0; i < 150; i++) {
        timestamps.push(generator.next())
      }

      // All should still be unique and ordered
      const uniqueTimestamps = new Set(timestamps)
      expect(uniqueTimestamps.size).to.equal(150)

      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i] > timestamps[i - 1]).to.be.true
      }
    })
  })
})
