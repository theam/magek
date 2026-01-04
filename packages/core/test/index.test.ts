import { expect } from './expect'
import {
  Magek,
  eventDispatcher,
  notifySubscribers,
  graphQLDispatcher,
  triggerScheduledCommands,
  consumeEventStream,
  produceEventStream,
  health,
} from '../src/'
import { fake, replace, restore } from 'sinon'
import { MagekEventDispatcher } from '../src/event-dispatcher'
import { MagekGraphQLDispatcher } from '../src/graphql-dispatcher'
import { MagekScheduledCommandDispatcher } from '../src/scheduled-command-dispatcher'
import { MagekSubscribersNotifier } from '../src/subscribers-notifier'
import { MagekEventStreamConsumer } from '../src/event-stream-consumer'
import { MagekEventStreamProducer } from '../src/event-stream-producer'
import { MagekHealthService } from '../src/sensor'

describe('framework-core package', () => {
  afterEach(() => {
    restore()
  })

  context('`eventDispatcher` function', () => {
    it('calls the `dispatch` method of the `MagekEventDispatcher` class', async () => {
      const fakeDispatch = fake.resolves(undefined)
      const fakeRawEvents = { some: 'events' }
      replace(MagekEventDispatcher, 'dispatch', fakeDispatch)
      await eventDispatcher(fakeRawEvents)
      expect(fakeDispatch).to.have.been.calledOnceWithExactly(fakeRawEvents, Magek.config)
    })
  })

  context('`graphQLDispatcher` function', () => {
    it('calls the `dispatch` method of the `MagekGraphQLDispatcher` class', async () => {
      const fakeDispatch = fake.resolves(undefined)
      const fakeRawRequest = { some: 'request' }
      replace(MagekGraphQLDispatcher.prototype, 'dispatch', fakeDispatch)
      await graphQLDispatcher(fakeRawRequest)
      expect(fakeDispatch).to.have.been.calledOnceWithExactly(fakeRawRequest)
    })
  })

  context('`triggerScheduledCommands` function', () => {
    it('calls the `dispatch` method of the `MagekScheduledCommandDispatcher` class', async () => {
      const fakeDispatch = fake.resolves(undefined)
      const fakeRawRequest = { some: 'request' }
      replace(MagekScheduledCommandDispatcher.prototype, 'dispatch', fakeDispatch)
      await triggerScheduledCommands(fakeRawRequest)
      expect(fakeDispatch).to.have.been.calledOnceWithExactly(fakeRawRequest)
    })
  })

  context('`notifySubscribers` function', () => {
    it('calls the `dispatch` method of the `MagekSubscribersNotifier` class', async () => {
      const fakeDispatch = fake.resolves(undefined)
      const fakeRawRequest = { some: 'request' }
      replace(MagekSubscribersNotifier.prototype, 'dispatch', fakeDispatch)
      await notifySubscribers(fakeRawRequest)
      expect(fakeDispatch).to.have.been.calledOnceWithExactly(fakeRawRequest)
    })
  })

  context('`consumeEventStream` function', () => {
    it('calls the `consume` method of the `MagekEventStreamConsumer` class', async () => {
      const fakeConsume = fake.resolves(undefined)
      const fakeRawEvent = { some: 'event' }
      replace(MagekEventStreamConsumer, 'consume', fakeConsume)
      await consumeEventStream(fakeRawEvent)
      expect(fakeConsume).to.have.been.calledOnceWithExactly(fakeRawEvent, Magek.config)
    })
  })

  context('`produceEventStream` function', () => {
    it('calls the `produce` method of the `MagekEventStreamProducer` class', async () => {
      const fakeProduce = fake.resolves(undefined)
      const fakeRawEvent = { some: 'event' }
      replace(MagekEventStreamProducer, 'produce', fakeProduce)
      await produceEventStream(fakeRawEvent)
      expect(fakeProduce).to.have.been.calledOnceWithExactly(fakeRawEvent, Magek.config)
    })
  })

  context('`health` function', () => {
    it('calls the `health` method of the `MagekHealthService` class', async () => {
      const fakeHealth = fake.resolves(undefined)
      const fakeRawRequest = { some: 'request' }
      replace(MagekHealthService.prototype, 'health', fakeHealth)
      await health(fakeRawRequest)
      expect(fakeHealth).to.have.been.calledOnceWithExactly(fakeRawRequest)
    })
  })
})
