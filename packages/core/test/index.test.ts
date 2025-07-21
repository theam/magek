import { expect } from './expect'
import {
  Magek,
  boosterEventDispatcher,
  boosterNotifySubscribers,
  boosterRocketDispatcher,
  boosterServeGraphQL,
  boosterTriggerScheduledCommands,
  boosterConsumeEventStream,
  boosterProduceEventStream,
  boosterHealth,
} from '../src/'
import { fake, replace, restore } from 'sinon'
import { MagekEventDispatcher } from '../src/event-dispatcher'
import { MagekGraphQLDispatcher } from '../src/graphql-dispatcher'
import { MagekScheduledCommandDispatcher } from '../src/scheduled-command-dispatcher'
import { MagekSubscribersNotifier } from '../src/subscribers-notifier'
import { MagekRocketDispatcher } from '../src/rocket-dispatcher'
import { MagekEventStreamConsumer } from '../src/event-stream-consumer'
import { MagekEventStreamProducer } from '../src/event-stream-producer'
import { MagekHealthService } from '../src/sensor'

describe('framework-core package', () => {
  afterEach(() => {
    restore()
  })

  context('`boosterEventDispatcher` function', () => {
    it('calls the `dispatch` method of the `MagekEventDispatcher` class', async () => {
      const fakeDispatch = fake.resolves(undefined)
      const fakeRawEvents = { some: 'events' }
      replace(MagekEventDispatcher, 'dispatch', fakeDispatch)
      await boosterEventDispatcher(fakeRawEvents)
      expect(fakeDispatch).to.have.been.calledOnceWithExactly(fakeRawEvents, Magek.config)
    })
  })

  context('`boosterServeGraphQL` function', () => {
    it('calls the `dispatch` method of the `MagekGraphQLDispatcher` class', async () => {
      const fakeDispatch = fake.resolves(undefined)
      const fakeRawRequest = { some: 'request' }
      replace(MagekGraphQLDispatcher.prototype, 'dispatch', fakeDispatch)
      await boosterServeGraphQL(fakeRawRequest)
      expect(fakeDispatch).to.have.been.calledOnceWithExactly(fakeRawRequest)
    })
  })

  context('`boosterTriggerScheduledCommands` function', () => {
    it('calls the `dispatch` method of the `MagekScheduledCommandDispatcher` class', async () => {
      const fakeDispatch = fake.resolves(undefined)
      const fakeRawRequest = { some: 'request' }
      replace(MagekScheduledCommandDispatcher.prototype, 'dispatch', fakeDispatch)
      await boosterTriggerScheduledCommands(fakeRawRequest)
      expect(fakeDispatch).to.have.been.calledOnceWithExactly(fakeRawRequest)
    })
  })

  context('`boosterNotifySubscribers` function', () => {
    it('calls the `dispatch` method of the `MagekSubscribersNotifier` class', async () => {
      const fakeDispatch = fake.resolves(undefined)
      const fakeRawRequest = { some: 'request' }
      replace(MagekSubscribersNotifier.prototype, 'dispatch', fakeDispatch)
      await boosterNotifySubscribers(fakeRawRequest)
      expect(fakeDispatch).to.have.been.calledOnceWithExactly(fakeRawRequest)
    })
  })

  context('`boosterRocketDispatcher` function', () => {
    it('calls the `dispatch` method of the `MagekRocketDispatcher` class', async () => {
      const fakeDispatch = fake.resolves(undefined)
      const fakeRawRequest = { some: 'request' }
      replace(MagekRocketDispatcher.prototype, 'dispatch', fakeDispatch)
      await boosterRocketDispatcher(fakeRawRequest)
      expect(fakeDispatch).to.have.been.calledOnceWithExactly(fakeRawRequest)
    })
  })

  context('`boosterConsumeEventStream` function', () => {
    it('calls the `consume` method of the `MagekEventStreamConsumer` class', async () => {
      const fakeConsume = fake.resolves(undefined)
      const fakeRawEvent = { some: 'event' }
      replace(MagekEventStreamConsumer, 'consume', fakeConsume)
      await boosterConsumeEventStream(fakeRawEvent)
      expect(fakeConsume).to.have.been.calledOnceWithExactly(fakeRawEvent, Magek.config)
    })
  })

  context('`boosterProduceEventStream` function', () => {
    it('calls the `produce` method of the `MagekEventStreamProducer` class', async () => {
      const fakeProduce = fake.resolves(undefined)
      const fakeRawEvent = { some: 'event' }
      replace(MagekEventStreamProducer, 'produce', fakeProduce)
      await boosterProduceEventStream(fakeRawEvent)
      expect(fakeProduce).to.have.been.calledOnceWithExactly(fakeRawEvent, Magek.config)
    })
  })

  context('`boosterHealth` function', () => {
    it('calls the `boosterHealth` method of the `MagekHealthService` class', async () => {
      const fakeHealth = fake.resolves(undefined)
      const fakeRawRequest = { some: 'request' }
      replace(MagekHealthService.prototype, 'boosterHealth', fakeHealth)
      await boosterHealth(fakeRawRequest)
      expect(fakeHealth).to.have.been.calledOnceWithExactly(fakeRawRequest)
    })
  })
})
