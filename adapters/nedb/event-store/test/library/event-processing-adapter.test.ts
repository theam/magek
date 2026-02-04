import { EventEnvelope, MagekConfig } from '@magek/common'
import { expect } from '../expect'
import { faker } from '@faker-js/faker'
import { restore } from 'sinon'
import * as fs from 'fs'
import { EventRegistry } from '../../src/event-registry'
import { fetchUnprocessedEvents, markEventProcessed } from '../../src/library/event-processing-adapter'
import { eventProcessingCursorFile } from '../../src/paths'

function createMockEventEnvelopeWithId(createdAt?: string): EventEnvelope {
  return {
    kind: 'event',
    superKind: 'domain',
    entityID: faker.string.uuid(),
    entityTypeName: faker.lorem.word(),
    value: {
      id: faker.string.uuid(),
    },
    createdAt: createdAt ?? faker.date.past().toISOString(),
    requestID: faker.string.uuid(),
    typeName: faker.lorem.word(),
    version: faker.number.int(),
  }
}

const noopLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

function createMockConfig(batchSize = 100): MagekConfig {
  const config = new MagekConfig('test')
  config.eventProcessingBatchSize = batchSize
  config.logger = noopLogger
  return config
}

describe('event-processing-adapter', () => {
  let eventRegistry: EventRegistry
  let config: MagekConfig

  beforeEach(async () => {
    eventRegistry = new EventRegistry()
    config = createMockConfig()

    // Clear all events and cursor
    await eventRegistry.deleteAll()
    if (fs.existsSync(eventProcessingCursorFile)) {
      fs.unlinkSync(eventProcessingCursorFile)
    }
  })

  afterEach(() => {
    restore()
    // Clean up cursor file
    if (fs.existsSync(eventProcessingCursorFile)) {
      fs.unlinkSync(eventProcessingCursorFile)
    }
  })

  describe('fetchUnprocessedEvents', () => {
    it('should return empty array when no events exist', async () => {
      const result = await fetchUnprocessedEvents(eventRegistry, config)

      expect(result).to.be.an('array').that.is.empty
    })

    it('should return all events when no cursor exists', async () => {
      const event1 = createMockEventEnvelopeWithId(new Date('2024-01-01').toISOString())
      const event2 = createMockEventEnvelopeWithId(new Date('2024-01-02').toISOString())

      await eventRegistry.store(event1)
      await eventRegistry.store(event2)

      const result = await fetchUnprocessedEvents(eventRegistry, config)

      expect(result).to.have.lengthOf(2)
    })

    it('should respect batch size', async () => {
      const smallBatchConfig = createMockConfig(2)

      for (let i = 0; i < 5; i++) {
        await eventRegistry.store(createMockEventEnvelopeWithId(new Date(2024, 0, i + 1).toISOString()))
      }

      const result = await fetchUnprocessedEvents(eventRegistry, smallBatchConfig)

      expect(result).to.have.lengthOf(2)
    })

    it('should return events sorted by createdAt ascending', async () => {
      const event1 = createMockEventEnvelopeWithId(new Date('2024-01-03').toISOString())
      const event2 = createMockEventEnvelopeWithId(new Date('2024-01-01').toISOString())
      const event3 = createMockEventEnvelopeWithId(new Date('2024-01-02').toISOString())

      await eventRegistry.store(event1)
      await eventRegistry.store(event2)
      await eventRegistry.store(event3)

      const result = await fetchUnprocessedEvents(eventRegistry, config)

      expect(result).to.have.lengthOf(3)
      expect(new Date(result[0].createdAt).getTime()).to.be.lessThan(new Date(result[1].createdAt).getTime())
      expect(new Date(result[1].createdAt).getTime()).to.be.lessThan(new Date(result[2].createdAt).getTime())
    })

    it('should only return events after cursor', async () => {
      const event1 = createMockEventEnvelopeWithId(new Date('2024-01-01').toISOString())
      const event2 = createMockEventEnvelopeWithId(new Date('2024-01-02').toISOString())
      const event3 = createMockEventEnvelopeWithId(new Date('2024-01-03').toISOString())

      await eventRegistry.store(event1)
      await eventRegistry.store(event2)
      await eventRegistry.store(event3)

      // Set cursor to after event1
      fs.writeFileSync(eventProcessingCursorFile, JSON.stringify({ cursor: event1.createdAt }), 'utf-8')

      const result = await fetchUnprocessedEvents(eventRegistry, config)

      expect(result).to.have.lengthOf(2)
      expect(result[0].createdAt).to.equal(event2.createdAt)
    })

    it('should exclude deleted events', async () => {
      const event1 = createMockEventEnvelopeWithId(new Date('2024-01-01').toISOString())
      const deletedEvent: EventEnvelope = {
        ...createMockEventEnvelopeWithId(new Date('2024-01-02').toISOString()),
        deletedAt: new Date().toISOString(),
      }

      await eventRegistry.store(event1)
      await eventRegistry.store(deletedEvent)

      const result = await fetchUnprocessedEvents(eventRegistry, config)

      expect(result).to.have.lengthOf(1)
      expect(result[0].createdAt).to.equal(event1.createdAt)
    })
  })

  describe('markEventProcessed', () => {
    it('should set processedAt on the event', async () => {
      const event = createMockEventEnvelopeWithId()
      await eventRegistry.store(event)

      // Get the stored event with its _id
      const storedEvents = (await eventRegistry.query({ createdAt: event.createdAt })) as any[]
      const storedEvent = storedEvents[0]

      await markEventProcessed(eventRegistry, config, storedEvent._id)

      // Verify the event has processedAt set
      const updatedEvents = (await eventRegistry.query({ _id: storedEvent._id })) as any[]
      expect(updatedEvents[0].processedAt).to.be.a('string')
    })

    it('should update the cursor file', async () => {
      const event = createMockEventEnvelopeWithId(new Date('2024-01-15').toISOString())
      await eventRegistry.store(event)

      const storedEvents = (await eventRegistry.query({ createdAt: event.createdAt })) as any[]
      const storedEvent = storedEvents[0]

      await markEventProcessed(eventRegistry, config, storedEvent._id)

      // Verify cursor was updated
      expect(fs.existsSync(eventProcessingCursorFile)).to.be.true
      const cursorData = JSON.parse(fs.readFileSync(eventProcessingCursorFile, 'utf-8'))
      expect(cursorData.cursor).to.equal(event.createdAt)
    })

    it('should handle non-existent event gracefully', async () => {
      // Should not throw
      await markEventProcessed(eventRegistry, config, 'non-existent-id')

      // Cursor should not be updated
      expect(fs.existsSync(eventProcessingCursorFile)).to.be.false
    })
  })

  describe('integration: fetch and mark workflow', () => {
    it('should process events in order and advance cursor', async () => {
      const event1 = createMockEventEnvelopeWithId(new Date('2024-01-01').toISOString())
      const event2 = createMockEventEnvelopeWithId(new Date('2024-01-02').toISOString())
      const event3 = createMockEventEnvelopeWithId(new Date('2024-01-03').toISOString())

      await eventRegistry.store(event1)
      await eventRegistry.store(event2)
      await eventRegistry.store(event3)

      // First fetch - should get all 3 events
      let events = await fetchUnprocessedEvents(eventRegistry, config)
      expect(events).to.have.lengthOf(3)

      // Mark first event as processed
      const firstEvent = events[0] as any
      await markEventProcessed(eventRegistry, config, firstEvent._id)

      // Second fetch - should get remaining 2 events
      events = await fetchUnprocessedEvents(eventRegistry, config)
      expect(events).to.have.lengthOf(2)

      // Mark second event as processed
      const secondEvent = events[0] as any
      await markEventProcessed(eventRegistry, config, secondEvent._id)

      // Third fetch - should get remaining 1 event
      events = await fetchUnprocessedEvents(eventRegistry, config)
      expect(events).to.have.lengthOf(1)

      // Mark third event as processed
      const thirdEvent = events[0] as any
      await markEventProcessed(eventRegistry, config, thirdEvent._id)

      // Fourth fetch - should be empty
      events = await fetchUnprocessedEvents(eventRegistry, config)
      expect(events).to.be.empty
    })
  })
})
