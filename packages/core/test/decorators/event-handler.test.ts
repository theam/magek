 
 
import { expect } from '../expect'
import { EventHandler } from '../../src/decorators'
import { Magek } from '../../src'
import { Event } from '../../src/decorators'
import { UUID, Register, MagekConfig } from '@magek/common'

describe('the `EventHandler` decorator', () => {
  afterEach(() => {
    Magek.configureCurrentEnv((config: MagekConfig) => {
      for (const propName in config.events) {
        delete config.events[propName]
      }
      for (const propName in config.eventHandlers) {
        delete config.eventHandlers[propName]
      }
    })
  })

  it('registers the event handler class as an event handler in Magek configuration', () => {
    @Event
    class SomeEvent {
      public entityID(): UUID {
        return '123'
      }
    }

    @EventHandler(SomeEvent)
    class SomeEventHandler {
      public static handle(_event: SomeEvent, _register: Register): Promise<void> {
        return Promise.resolve()
      }
    }

    const booster = Magek as any
    const someEventHandlers = booster.config.eventHandlers['SomeEvent']

    expect(someEventHandlers).to.be.an('Array')
    expect(someEventHandlers).to.contain(SomeEventHandler)
  })
})
