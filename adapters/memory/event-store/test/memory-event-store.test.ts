import { expect } from './expect'
import { MemoryEventRegistry } from '../src/memory-event-registry'
import {
  EventEnvelope,
  EntitySnapshotEnvelope,
} from '@magek/common'
import { faker } from '@faker-js/faker'

describe('MemoryEventRegistry', () => {
  let registry: MemoryEventRegistry

  beforeEach(() => {
    registry = new MemoryEventRegistry()
  })

  function createMockEventEnvelope(overrides?: Partial<EventEnvelope>): EventEnvelope {
    return {
      kind: 'event',
      superKind: 'domain',
      typeName: faker.string.alphanumeric(10),
      entityTypeName: faker.string.alphanumeric(10),
      entityID: faker.string.uuid(),
      value: { data: faker.string.alphanumeric(20) },
      version: 1,
      requestID: faker.string.uuid(),
      createdAt: new Date().toISOString(),
      ...overrides,
    }
  }

  function createMockSnapshotEnvelope(overrides?: Partial<EntitySnapshotEnvelope>): EntitySnapshotEnvelope {
    const now = new Date().toISOString()
    return {
      kind: 'snapshot',
      superKind: 'domain',
      typeName: faker.string.alphanumeric(10),
      entityTypeName: faker.string.alphanumeric(10),
      entityID: faker.string.uuid(),
      value: { data: faker.string.alphanumeric(20) },
      version: 1,
      requestID: faker.string.uuid(),
      snapshottedEventCreatedAt: now,
      createdAt: now,
      persistedAt: now,
      ...overrides,
    }
  }

  describe('store and query', () => {
    it('should store and retrieve an event', async () => {
      const event = createMockEventEnvelope()

      await registry.store(event)

      const results = await registry.query({ kind: 'event' })
      expect(results).to.have.length(1)
      expect(results[0]).to.include({
        typeName: event.typeName,
        entityTypeName: event.entityTypeName,
        entityID: event.entityID,
      })
    })

    it('should store and retrieve a snapshot', async () => {
      const snapshot = createMockSnapshotEnvelope()

      await registry.store(snapshot)

      const results = await registry.query({ kind: 'snapshot' })
      expect(results).to.have.length(1)
      expect(results[0]).to.include({
        typeName: snapshot.typeName,
        entityTypeName: snapshot.entityTypeName,
        entityID: snapshot.entityID,
      })
    })

    it('should filter events by entityTypeName', async () => {
      const entityTypeName = 'TestEntity'
      const event1 = createMockEventEnvelope({ entityTypeName })
      const event2 = createMockEventEnvelope({ entityTypeName: 'OtherEntity' })

      await registry.store(event1)
      await registry.store(event2)

      const results = await registry.query({ kind: 'event', entityTypeName })
      expect(results).to.have.length(1)
      expect(results[0].entityTypeName).to.equal(entityTypeName)
    })

    it('should filter events by entityID', async () => {
      const entityID = faker.string.uuid()
      const event1 = createMockEventEnvelope({ entityID })
      const event2 = createMockEventEnvelope()

      await registry.store(event1)
      await registry.store(event2)

      const results = await registry.query({ kind: 'event', entityID })
      expect(results).to.have.length(1)
      expect(results[0].entityID).to.equal(entityID)
    })

    it('should filter by createdAt with $gt', async () => {
      const pastDate = new Date(Date.now() - 10000).toISOString()
      const futureDate = new Date(Date.now() + 10000).toISOString()

      const event1 = createMockEventEnvelope({ createdAt: pastDate })
      const event2 = createMockEventEnvelope({ createdAt: futureDate })

      await registry.store(event1)
      await registry.store(event2)

      const results = await registry.query({
        kind: 'event',
        createdAt: { $gt: new Date().toISOString() },
      })

      expect(results).to.have.length(1)
      expect(results[0].createdAt).to.equal(futureDate)
    })

    it('should filter by deletedAt $exists false', async () => {
      const event1 = createMockEventEnvelope()
      const event2 = createMockEventEnvelope({ deletedAt: new Date().toISOString() })

      await registry.store(event1)
      await registry.store(event2)

      const results = await registry.query({
        kind: 'event',
        deletedAt: { $exists: false },
      })

      expect(results).to.have.length(1)
    })

    it('should sort results by createdAt ascending', async () => {
      const event1 = createMockEventEnvelope({ createdAt: new Date(Date.now() + 1000).toISOString() })
      const event2 = createMockEventEnvelope({ createdAt: new Date(Date.now() - 1000).toISOString() })

      await registry.store(event1)
      await registry.store(event2)

      const results = await registry.query({ kind: 'event' }, 'asc')

      expect(results[0].createdAt).to.equal(event2.createdAt)
      expect(results[1].createdAt).to.equal(event1.createdAt)
    })

    it('should sort results by createdAt descending', async () => {
      const event1 = createMockEventEnvelope({ createdAt: new Date(Date.now() + 1000).toISOString() })
      const event2 = createMockEventEnvelope({ createdAt: new Date(Date.now() - 1000).toISOString() })

      await registry.store(event1)
      await registry.store(event2)

      const results = await registry.query({ kind: 'event' }, 'desc')

      expect(results[0].createdAt).to.equal(event1.createdAt)
      expect(results[1].createdAt).to.equal(event2.createdAt)
    })

    it('should apply limit to results', async () => {
      const event1 = createMockEventEnvelope()
      const event2 = createMockEventEnvelope()
      const event3 = createMockEventEnvelope()

      await registry.store(event1)
      await registry.store(event2)
      await registry.store(event3)

      const results = await registry.query({ kind: 'event' }, 'asc', 2)

      expect(results).to.have.length(2)
    })
  })

  describe('queryLatestSnapshot', () => {
    it('should return the latest snapshot for an entity', async () => {
      const entityTypeName = 'TestEntity'
      const entityID = faker.string.uuid()

      const olderSnapshot = createMockSnapshotEnvelope({
        entityTypeName,
        entityID,
        snapshottedEventCreatedAt: new Date(Date.now() - 10000).toISOString(),
      })
      const newerSnapshot = createMockSnapshotEnvelope({
        entityTypeName,
        entityID,
        snapshottedEventCreatedAt: new Date(Date.now() + 10000).toISOString(),
      })

      await registry.store(olderSnapshot)
      await registry.store(newerSnapshot)

      const result = await registry.queryLatestSnapshot({ entityTypeName, entityID })

      expect(result).to.not.be.undefined
      expect(result!.snapshottedEventCreatedAt).to.equal(newerSnapshot.snapshottedEventCreatedAt)
    })

    it('should return undefined when no snapshot exists', async () => {
      const result = await registry.queryLatestSnapshot({
        entityTypeName: 'NonExistent',
        entityID: faker.string.uuid(),
      })

      expect(result).to.be.undefined
    })
  })

  describe('storeDispatched', () => {
    it('should return true for first dispatch of an event', async () => {
      const eventId = 'test-event-1'

      const result = await registry.storeDispatched(eventId)

      expect(result).to.be.true
    })

    it('should return false for duplicate dispatch', async () => {
      const eventId = 'test-event-1'

      await registry.storeDispatched(eventId)
      const result = await registry.storeDispatched(eventId)

      expect(result).to.be.false
    })
  })

  describe('replaceOrDeleteItem', () => {
    it('should soft delete an event by replacing it', async () => {
      const event = createMockEventEnvelope()
      const id = await registry.store(event)

      const deletedEvent = {
        ...event,
        id,
        deletedAt: new Date().toISOString(),
        value: {},
      } as EventEnvelope

      await registry.replaceOrDeleteItem(id, deletedEvent)

      const results = await registry.query({ kind: 'event', deletedAt: { $exists: false } })
      expect(results).to.have.length(0)
    })

    it('should hard delete a snapshot', async () => {
      const snapshot = createMockSnapshotEnvelope()
      const id = await registry.store(snapshot)

      await registry.replaceOrDeleteItem(id)

      const results = await registry.query({ kind: 'snapshot' })
      expect(results).to.have.length(0)
    })
  })

  describe('deleteAll', () => {
    it('should delete all events and snapshots', async () => {
      await registry.store(createMockEventEnvelope())
      await registry.store(createMockEventEnvelope())
      await registry.store(createMockSnapshotEnvelope())

      const count = await registry.deleteAll()

      expect(count).to.equal(3)
      expect(registry.getEventsCount()).to.equal(0)
      expect(registry.getSnapshotsCount()).to.equal(0)
    })
  })

  describe('count', () => {
    it('should return total count without filter', async () => {
      await registry.store(createMockEventEnvelope())
      await registry.store(createMockEventEnvelope())
      await registry.store(createMockSnapshotEnvelope())

      const count = await registry.count()

      expect(count).to.equal(3)
    })

    it('should return filtered count', async () => {
      const entityTypeName = 'TestEntity'
      await registry.store(createMockEventEnvelope({ entityTypeName }))
      await registry.store(createMockEventEnvelope({ entityTypeName: 'OtherEntity' }))

      const count = await registry.count({ kind: 'event', entityTypeName })

      expect(count).to.equal(1)
    })
  })
})
