import 'reflect-metadata'
import { MagekEventDispatcher } from '../src/event-dispatcher'
import { fake, replace, restore, SinonSpy } from 'sinon'
import { MagekConfig, Runtime, UUID } from '@magek/common'
import { field } from '../src'
import { expect } from './expect'
import { RawEventsParser } from '../src/services/raw-events-parser'
import { MagekEventProcessor } from '../src/event-processor'
import { createMockEventStoreAdapter } from './helpers/event-store-adapter-helper'

class SomeEvent {
  @field(type => UUID)
  public readonly id: UUID

  public constructor(id: UUID) {
    this.id = id
  }

  public entityID(): UUID {
    return this.id
  }

  public getPrefixedId(prefix: string): string {
    return `${prefix}-${this.id}`
  }
}

class SomeNotification {
  public constructor() {}
}

describe('MagekEventDispatcher', () => {
  afterEach(() => {
    restore()
  })

  const config = new MagekConfig('test')
  config.runtime = {} as Runtime
  config.events[SomeEvent.name] = { class: SomeEvent }
  config.notifications[SomeNotification.name] = { class: SomeNotification }
  config.logger = {
    info: fake(),
    error: fake(),
    debug: fake(),
    warn: fake(),
  }
  const rawEvents = [{ some: 'raw event' }, { some: 'other raw event' }]
  const events = [{ some: 'raw event' }, { some: 'other raw event' }]
  const fakeRawToEnvelopes: SinonSpy = fake.returns(events)
  config.eventStoreAdapter = createMockEventStoreAdapter({
    rawToEnvelopes: fakeRawToEnvelopes,
  })

  context('with a configured provider', () => {
    describe('the `dispatch` method', () => {
      it('calls the raw events parser once and processes all messages', async () => {
        replace(RawEventsParser, 'streamPerEntityEvents', fake())

        await MagekEventDispatcher.dispatch(rawEvents, config)

        expect(RawEventsParser.streamPerEntityEvents).to.have.been.calledWithMatch(
          config,
          events,
          (MagekEventProcessor as any).eventProcessor
        )
      })

      it('logs and ignores errors thrown by `streamPerEntityEvents`', async () => {
        const error = new Error('some error')
        replace(RawEventsParser, 'streamPerEntityEvents', fake.rejects(error))

        const rawEvents = [{ some: 'raw event' }, { some: 'other raw event' }]
        await expect(MagekEventDispatcher.dispatch(rawEvents, config)).not.to.be.rejected

        expect(config.logger?.error).to.have.been.calledWith(
          '[Magek]|MagekEventDispatcher#dispatch: ',
          'Unhandled error while dispatching event: ',
          error
        )
      })
    })
  })
})
