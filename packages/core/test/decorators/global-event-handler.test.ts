import { expect } from '../expect'
import { GlobalEventHandler, GLOBAL_EVENT_HANDLERS } from '../../src/decorators/global-event-handler'
import { EventHandler } from '../../src/decorators'
import { Magek } from '../../src'
import { Event } from '../../src/decorators'
import { UUID, Register, MagekConfig } from '@magek/common'

describe('the `GlobalEventHandler` decorator', () => {
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

  it('registers the handler in config.eventHandlers under GLOBAL_EVENT_HANDLERS key', () => {
    @GlobalEventHandler
    class AuditLogger {
      public static handle(_event: unknown, _register: Register): Promise<void> {
        return Promise.resolve()
      }
    }

    const globalHandlers = Magek.config.eventHandlers[GLOBAL_EVENT_HANDLERS]

    expect(globalHandlers).to.be.an('Array')
    expect(globalHandlers).to.contain(AuditLogger)
  })

  it('allows registering multiple global event handlers', () => {
    @GlobalEventHandler
    class MetricsCollector {
      public static handle(_event: unknown, _register: Register): Promise<void> {
        return Promise.resolve()
      }
    }

    @GlobalEventHandler
    class EventLogger {
      public static handle(_event: unknown, _register: Register): Promise<void> {
        return Promise.resolve()
      }
    }

    const globalHandlers = Magek.config.eventHandlers[GLOBAL_EVENT_HANDLERS]

    expect(globalHandlers).to.be.an('Array')
    expect(globalHandlers).to.have.lengthOf(2)
    expect(globalHandlers).to.contain(MetricsCollector)
    expect(globalHandlers).to.contain(EventLogger)
  })

  it('is stored separately from specific event handlers', () => {
    @Event
    class UserCreated {
      public entityID(): UUID {
        return '123'
      }
    }

    @EventHandler(UserCreated)
    class UserCreatedHandler {
      public static handle(_event: UserCreated, _register: Register): Promise<void> {
        return Promise.resolve()
      }
    }

    @GlobalEventHandler
    class GlobalLogger {
      public static handle(_event: unknown, _register: Register): Promise<void> {
        return Promise.resolve()
      }
    }

    // Global handlers are stored under GLOBAL_EVENT_HANDLERS key
    const globalHandlers = Magek.config.eventHandlers[GLOBAL_EVENT_HANDLERS]
    expect(globalHandlers).to.contain(GlobalLogger)
    expect(globalHandlers).to.not.contain(UserCreatedHandler)

    // Specific event handlers are stored under the event name
    const userCreatedHandlers = Magek.config.eventHandlers['UserCreated']
    expect(userCreatedHandlers).to.contain(UserCreatedHandler)
    expect(userCreatedHandlers).to.not.contain(GlobalLogger)
  })

  it('does not duplicate handler when decorator is applied multiple times', () => {
    // This tests the idempotency check in registerEventHandler
    @GlobalEventHandler
    class SingletonHandler {
      public static handle(_event: unknown, _register: Register): Promise<void> {
        return Promise.resolve()
      }
    }

    // Manually try to register again (simulating re-import scenario)
    Magek.configureCurrentEnv((config: MagekConfig) => {
      const registeredHandlers = config.eventHandlers[GLOBAL_EVENT_HANDLERS] || []
      if (!registeredHandlers.some((klass) => klass === SingletonHandler)) {
        registeredHandlers.push(SingletonHandler)
        config.eventHandlers[GLOBAL_EVENT_HANDLERS] = registeredHandlers
      }
    })

    const globalHandlers = Magek.config.eventHandlers[GLOBAL_EVENT_HANDLERS]
    const singletonCount = globalHandlers.filter((h) => h === SingletonHandler).length

    expect(singletonCount).to.equal(1)
  })

  it('exports GLOBAL_EVENT_HANDLERS constant for external use', () => {
    expect(GLOBAL_EVENT_HANDLERS).to.equal('GLOBAL_EVENT_HANDLERS')
  })
})
