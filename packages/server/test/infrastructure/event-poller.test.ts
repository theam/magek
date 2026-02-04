import { restore, stub, SinonStub, useFakeTimers, SinonFakeTimers } from 'sinon'
import { expect } from '../expect'
import { faker } from '@faker-js/faker'
import { MagekConfig, UserApp, EventEnvelope } from '@magek/common'
import { startEventPolling, stopEventPolling } from '../../src/infrastructure/event-poller'

function createMockEventEnvelope(id?: string): EventEnvelope {
  return {
    id: id ?? faker.string.uuid(),
    kind: 'event',
    superKind: 'domain',
    entityID: faker.string.uuid(),
    entityTypeName: faker.lorem.word(),
    value: { id: faker.string.uuid() },
    createdAt: faker.date.past().toISOString(),
    requestID: faker.string.uuid(),
    typeName: faker.lorem.word(),
    version: faker.number.int(),
  }
}

describe('Event Poller', () => {
  let clock: SinonFakeTimers
  let mockConfig: MagekConfig
  let mockUserApp: UserApp
  let fetchUnprocessedEventsStub: SinonStub
  let markEventProcessedStub: SinonStub
  let eventDispatcherStub: SinonStub

  beforeEach(() => {
    clock = useFakeTimers()

    fetchUnprocessedEventsStub = stub().resolves([])
    markEventProcessedStub = stub().resolves()
    eventDispatcherStub = stub().resolves()

    mockConfig = {
      eventPollingIntervalMs: 1000,
      eventProcessingBatchSize: 100,
      eventStore: {
        fetchUnprocessedEvents: fetchUnprocessedEventsStub,
        markEventProcessed: markEventProcessedStub,
      },
      logLevel: 4, // error only
    } as unknown as MagekConfig

    mockUserApp = {
      eventDispatcher: eventDispatcherStub,
      Magek: { config: mockConfig },
    } as unknown as UserApp
  })

  afterEach(() => {
    stopEventPolling()
    clock.restore()
    restore()
  })

  describe('startEventPolling', () => {
    it('should start polling at the configured interval', async () => {
      startEventPolling(mockUserApp, mockConfig)

      // Initially not called
      expect(fetchUnprocessedEventsStub).not.to.have.been.called

      // Advance time by one interval
      await clock.tickAsync(1000)

      expect(fetchUnprocessedEventsStub).to.have.been.calledOnce

      // Advance time by another interval
      await clock.tickAsync(1000)

      expect(fetchUnprocessedEventsStub).to.have.been.calledTwice
    })

    it('should not call eventDispatcher when no events are found', async () => {
      fetchUnprocessedEventsStub.resolves([])

      startEventPolling(mockUserApp, mockConfig)
      await clock.tickAsync(1000)

      expect(eventDispatcherStub).not.to.have.been.called
    })

    it('should dispatch each event individually', async () => {
      const event1 = createMockEventEnvelope('event-1')
      const event2 = createMockEventEnvelope('event-2')
      fetchUnprocessedEventsStub.resolves([event1, event2])

      startEventPolling(mockUserApp, mockConfig)
      await clock.tickAsync(1000)

      expect(eventDispatcherStub).to.have.been.calledTwice
      expect(eventDispatcherStub.firstCall).to.have.been.calledWith([event1])
      expect(eventDispatcherStub.secondCall).to.have.been.calledWith([event2])
    })

    it('should mark each event as processed after successful dispatch', async () => {
      const event1 = createMockEventEnvelope('event-1')
      const event2 = createMockEventEnvelope('event-2')
      fetchUnprocessedEventsStub.resolves([event1, event2])

      startEventPolling(mockUserApp, mockConfig)
      await clock.tickAsync(1000)

      expect(markEventProcessedStub).to.have.been.calledTwice
      expect(markEventProcessedStub.firstCall).to.have.been.calledWith(mockConfig, 'event-1')
      expect(markEventProcessedStub.secondCall).to.have.been.calledWith(mockConfig, 'event-2')
    })

    it('should stop processing on dispatch error', async () => {
      const event1 = createMockEventEnvelope('event-1')
      const event2 = createMockEventEnvelope('event-2')
      fetchUnprocessedEventsStub.resolves([event1, event2])
      eventDispatcherStub.onFirstCall().rejects(new Error('Dispatch failed'))

      startEventPolling(mockUserApp, mockConfig)
      await clock.tickAsync(1000)

      // Should have tried to dispatch first event
      expect(eventDispatcherStub).to.have.been.calledOnce
      // Should not have marked any events as processed
      expect(markEventProcessedStub).not.to.have.been.called
    })

    it('should not mark event as processed if it has no id', async () => {
      const eventWithoutId = createMockEventEnvelope()
      delete (eventWithoutId as any).id
      fetchUnprocessedEventsStub.resolves([eventWithoutId])

      startEventPolling(mockUserApp, mockConfig)
      await clock.tickAsync(1000)

      expect(eventDispatcherStub).to.have.been.calledOnce
      expect(markEventProcessedStub).not.to.have.been.called
    })
  })

  describe('stopEventPolling', () => {
    it('should stop the polling loop', async () => {
      startEventPolling(mockUserApp, mockConfig)

      await clock.tickAsync(1000)
      expect(fetchUnprocessedEventsStub).to.have.been.calledOnce

      stopEventPolling()

      await clock.tickAsync(1000)
      // Should still be called only once
      expect(fetchUnprocessedEventsStub).to.have.been.calledOnce
    })
  })

  describe('when adapter does not support async processing', () => {
    it('should not throw when fetchUnprocessedEvents is not defined', async () => {
      const configWithoutSupport = {
        ...mockConfig,
        eventStore: {},
      } as unknown as MagekConfig

      startEventPolling(mockUserApp, configWithoutSupport)
      await clock.tickAsync(1000)

      // Should not throw, just silently skip
      expect(eventDispatcherStub).not.to.have.been.called
    })

    it('should not throw when markEventProcessed is not defined', async () => {
      const configWithPartialSupport = {
        ...mockConfig,
        eventStore: {
          fetchUnprocessedEvents: fetchUnprocessedEventsStub,
        },
      } as unknown as MagekConfig

      startEventPolling(mockUserApp, configWithPartialSupport)
      await clock.tickAsync(1000)

      // Should not throw, just silently skip
      expect(eventDispatcherStub).not.to.have.been.called
    })
  })
})
