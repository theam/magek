import { MagekDeleteEventDispatcher } from '../src/delete-event-dispatcher'
import {
  MagekConfig,
  EventDeleteParameters,
  EventEnvelopeFromDatabase,
  EntitySnapshotEnvelopeFromDatabase,
} from '@magek/common'
import { createMockEventStoreAdapter } from './helpers/event-store-adapter-helper'
import { expect } from './expect'
import { fake, restore, stub } from 'sinon'
import { ReadModelStore } from '../src/services/read-model-store'

describe('MagekDeleteEventDispatcher', () => {
  afterEach(() => {
    restore()
  })

  const parameters: EventDeleteParameters = {
    entityTypeName: 'SomeEntity',
    entityID: 'entity-id',
    createdAt: '2024-01-01T00:00:00.000Z',
  }

  it('returns false when no deletable events are found', async () => {
    const findDeletableEvent = fake.resolves([])
    const deleteSnapshot = fake.resolves()
    const deleteEvent = fake.resolves()

    const config = new MagekConfig('test')
    config.eventStoreAdapter = createMockEventStoreAdapter({
      findDeletableEvent,
      deleteSnapshot,
      deleteEvent,
    })

    const projectStub = stub(ReadModelStore.prototype, 'project').resolves()

    const result = await MagekDeleteEventDispatcher.deleteEvent(config, parameters)

    expect(result).to.be.false
    expect(findDeletableEvent).to.have.been.calledOnceWith(config, parameters)
    expect(projectStub).not.to.have.been.called
    expect(deleteSnapshot).not.to.have.been.called
    expect(deleteEvent).not.to.have.been.called
  })

  it('projects snapshots and deletes them before deleting events', async () => {
    const eventOne: EventEnvelopeFromDatabase = {
      id: 'event-1',
      version: 1,
      kind: 'event',
      superKind: 'domain',
      entityID: 'entity-id',
      entityTypeName: 'SomeEntity',
      value: {},
      requestID: 'request-1',
      typeName: 'SomeEvent',
      createdAt: '2024-01-01T00:00:00.000Z',
    }
    const eventTwo: EventEnvelopeFromDatabase = {
      id: 'event-2',
      version: 1,
      kind: 'event',
      superKind: 'domain',
      entityID: 'entity-id',
      entityTypeName: 'SomeEntity',
      value: {},
      requestID: 'request-2',
      typeName: 'SomeEvent',
      createdAt: '2024-01-02T00:00:00.000Z',
    }

    const snapshotOne: EntitySnapshotEnvelopeFromDatabase = {
      id: 'snapshot-1',
      version: 1,
      kind: 'snapshot',
      superKind: 'domain',
      entityID: 'entity-id',
      entityTypeName: 'SomeEntity',
      value: { id: 'entity-id' },
      requestID: 'request-1',
      typeName: 'SomeEntity',
      snapshottedEventCreatedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      persistedAt: '2024-01-01T00:00:00.000Z',
    }
    const snapshotTwo: EntitySnapshotEnvelopeFromDatabase = {
      id: 'snapshot-2',
      version: 1,
      kind: 'snapshot',
      superKind: 'domain',
      entityID: 'entity-id',
      entityTypeName: 'SomeEntity',
      value: { id: 'entity-id' },
      requestID: 'request-2',
      typeName: 'SomeEntity',
      snapshottedEventCreatedAt: '2024-01-02T00:00:00.000Z',
      createdAt: '2024-01-02T00:00:00.000Z',
      persistedAt: '2024-01-02T00:00:00.000Z',
    }
    const snapshotThree: EntitySnapshotEnvelopeFromDatabase = {
      id: 'snapshot-3',
      version: 1,
      kind: 'snapshot',
      superKind: 'domain',
      entityID: 'entity-id',
      entityTypeName: 'SomeEntity',
      value: { id: 'entity-id' },
      requestID: 'request-3',
      typeName: 'SomeEntity',
      snapshottedEventCreatedAt: '2024-01-03T00:00:00.000Z',
      createdAt: '2024-01-03T00:00:00.000Z',
      persistedAt: '2024-01-03T00:00:00.000Z',
    }

    const findDeletableEvent = fake.resolves([eventOne, eventTwo])
    const findDeletableSnapshot = stub()
      .onFirstCall()
      .resolves([snapshotOne])
      .onSecondCall()
      .resolves([snapshotTwo, snapshotThree])
    const deleteSnapshot = fake.resolves()
    const deleteEvent = fake.resolves()

    const config = new MagekConfig('test')
    config.eventStoreAdapter = createMockEventStoreAdapter({
      findDeletableEvent,
      findDeletableSnapshot,
      deleteSnapshot,
      deleteEvent,
    })

    const projectStub = stub(ReadModelStore.prototype, 'project').resolves()

    const result = await MagekDeleteEventDispatcher.deleteEvent(config, parameters)

    expect(result).to.be.true
    expect(findDeletableEvent).to.have.been.calledOnceWith(config, parameters)
    expect(findDeletableSnapshot).to.have.been.calledWith(config, eventOne)
    expect(findDeletableSnapshot).to.have.been.calledWith(config, eventTwo)
    expect(projectStub.callCount).to.equal(3)
    expect(projectStub).to.have.been.calledWith(snapshotOne, true)
    expect(projectStub).to.have.been.calledWith(snapshotTwo, true)
    expect(projectStub).to.have.been.calledWith(snapshotThree, true)
    expect(deleteSnapshot).to.have.been.calledTwice
    expect(deleteSnapshot).to.have.been.calledWith(config, [snapshotOne])
    expect(deleteSnapshot).to.have.been.calledWith(config, [snapshotTwo, snapshotThree])
    expect(deleteEvent).to.have.been.calledOnceWith(config, [eventOne, eventTwo])
  })
})
