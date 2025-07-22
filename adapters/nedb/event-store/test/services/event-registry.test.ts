 
import { EntitySnapshotEnvelope, EventEnvelope } from '@booster-ai/common'
import { expect } from '../expect'
import { faker } from '@faker-js/faker'

import { restore, stub } from 'sinon'
import {
  createMockEntitySnapshotEnvelope,
  createMockEventEnvelope,
  createMockEventEnvelopeForEntity,
} from '../helpers/event-helper'
import { EventRegistry } from '../../src/event-registry'

describe('the event registry', () => {
  let initialEventsCount: number
  let mockTargetEvent: EventEnvelope

  let eventRegistry: EventRegistry

  beforeEach(async () => {
    initialEventsCount = faker.datatype.number({ min: 2, max: 10 })
    eventRegistry = new EventRegistry()

    // Clear all events
    await eventRegistry.deleteAll()
  })

  afterEach(() => {
    restore()
  })

  describe('query', () => {
    describe('with db full of random events', () => {
      beforeEach(async () => {
        const publishPromises: Array<Promise<any>> = []

        for (let i = 0; i < initialEventsCount; i++) {
          publishPromises.push(eventRegistry.store(createMockEventEnvelope()))
        }

        await Promise.all(publishPromises)

        mockTargetEvent = createMockEventEnvelope()
        await eventRegistry.store(mockTargetEvent)
      })

      it('should return expected event', async () => {
        const result = (await eventRegistry.query({
          kind: mockTargetEvent.kind,
          entityID: mockTargetEvent.entityID,
          entityTypeName: mockTargetEvent.entityTypeName,
          value: mockTargetEvent.value,
          createdAt: mockTargetEvent.createdAt,
          requestID: mockTargetEvent.requestID,
          typeName: mockTargetEvent.typeName,
          version: mockTargetEvent.version,
        })) as Array<EventEnvelope>

        expect(result.length).to.be.equal(1)
        expect(result[0]).to.deep.include(mockTargetEvent)
      })
    })

    describe('with events of the same entity', () => {
      const entityName: string = faker.lorem.word()
      const entityId: string = faker.datatype.uuid()

      beforeEach(async () => {
        const publishPromises: Array<Promise<any>> = []

        for (let i = 0; i < initialEventsCount; i++) {
          publishPromises.push(eventRegistry.store(createMockEventEnvelopeForEntity(entityName, entityId)))
        }

        for (let i = 0; i < initialEventsCount; i++) {
          publishPromises.push(eventRegistry.store(createMockEventEnvelopeForEntity(entityName, faker.datatype.uuid())))
        }

        for (let i = 0; i < initialEventsCount; i++) {
          publishPromises.push(eventRegistry.store(createMockEventEnvelope()))
        }

        await Promise.all(publishPromises)
      })

      it('should return expected events of the same id sorted', async () => {
        const result: EventEnvelope[] = (await eventRegistry.query({
          kind: 'event',
          entityID: entityId,
          entityTypeName: entityName,
        })) as Array<EventEnvelope>

        expect(result.length).to.be.equal(initialEventsCount)
        expect(result[0].entityID).to.be.equal(entityId)
        expect(result[0].entityTypeName).to.be.equal(entityName)
        expect(new Date(result[0].createdAt)).to.be.lessThan(new Date(result[result.length - 1].createdAt))
      })
    })
  })

  describe('query latest entity snapshot', () => {
    let mockTargetSnapshot: EntitySnapshotEnvelope
    let copyOfMockTargetSnapshot: EntitySnapshotEnvelope
    let newerMockDate: string

    beforeEach(async () => {
      mockTargetSnapshot = createMockEntitySnapshotEnvelope()
      await eventRegistry.store(mockTargetSnapshot)

      newerMockDate = faker.date.recent().toISOString()
      copyOfMockTargetSnapshot = {
        ...mockTargetSnapshot,
        snapshottedEventCreatedAt: newerMockDate,
      }
      await eventRegistry.store(copyOfMockTargetSnapshot)
    })

    it('should return latest item', async () => {
      const result = await eventRegistry.queryLatestSnapshot({
        entityID: mockTargetSnapshot.entityID,
        entityTypeName: mockTargetSnapshot.entityTypeName,
      })

      expect(result).not.to.be.undefined
       
      const { _id, ...rest } = result as any
      expect(rest).to.deep.equal(copyOfMockTargetSnapshot)
    })

    it('should return null', async () => {
      const result = await eventRegistry.queryLatestSnapshot({
        entityID: faker.datatype.uuid(),
        entityTypeName: mockTargetSnapshot.entityTypeName,
      })

      expect(result).to.be.undefined
    })
  })

  describe('delete all', () => {
    beforeEach(async () => {
      const mockEvent: EventEnvelope = createMockEventEnvelope()
      await eventRegistry.store(mockEvent)
    })

    it('should clear all events', async () => {
      const numberOfDeletedEvents = await eventRegistry.deleteAll()

      expect(numberOfDeletedEvents).to.be.equal(1)
      expect(await eventRegistry.query({})).to.be.deep.equal([])
    })
  })

  describe('the publish method', () => {
    it('should insert events into the events database', async () => {
      const mockEvent: EventEnvelope = createMockEventEnvelope()

      eventRegistry.events.insertAsync = stub().returns(mockEvent)

      await eventRegistry.store(mockEvent)
      return expect(eventRegistry.events.insertAsync).to.have.been.called
    })

    it('should throw if the database `insert` fails', async () => {
      const event: EventEnvelope = {
        kind: 'event',
        superKind: 'domain',
        entityID: faker.datatype.uuid(),
        entityTypeName: faker.lorem.word(),
        value: {
          id: faker.datatype.uuid(),
        },
        createdAt: faker.date.past().toISOString(),
        requestID: faker.datatype.uuid(),
        typeName: faker.lorem.word(),
        version: faker.datatype.number(),
      }

      const error = new Error(faker.lorem.words())

      eventRegistry.events.insertAsync = stub().throws(error)

      await expect(eventRegistry.store(event)).to.be.rejectedWith(error)
    })
  })
})
