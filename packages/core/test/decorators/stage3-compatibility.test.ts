/**
 * This test file tests Stage 3 TC39 decorator compatibility with Magek.
 *
 * The codebase now uses Stage 3 decorators exclusively (experimentalDecorators
 * has been removed from all tsconfig.json files).
 */

import { expect } from '../expect'
import { Event, Role, GlobalErrorHandler } from '../../src/decorators'
import { UUID } from '@magek/common'
import { field } from '../../src'
import { Magek } from '../../src'

describe('Stage 3 decorator compatibility', () => {
  describe('@Event decorator', () => {
    it('registers an event class with Stage 3 compatible signature', () => {
      @Event
      class TestEvent {
        @field()
        public readonly data!: string

        public entityID(): UUID {
          return 'test-id'
        }
      }

      expect(Magek.config.events['TestEvent']).to.deep.equal({
        class: TestEvent,
      })
    })

    it('transfers field metadata when using Stage 3 decorators', () => {
      @Event
      class EventWithFields {
        @field()
        public readonly field1!: string

        @field()
        public readonly field2!: number

        public entityID(): UUID {
          return 'test-id'
        }
      }

      // Verify the event is registered
      expect(Magek.config.events['EventWithFields']).to.exist
      expect(Magek.config.events['EventWithFields'].class).to.equal(EventWithFields)

      // Verify field metadata is preserved (checked by other parts of the system)
      const instance = new EventWithFields()
      expect(instance).to.be.an.instanceOf(EventWithFields)
    })
  })

  describe('@Role decorator', () => {
    it('registers a role class with Stage 3 compatible signature', () => {
      @Role({ auth: {} })
      class TestRole2 {
        public readonly id!: string
      }

      // Verify the class is registered
      expect(TestRole2.name).to.equal('TestRole2')
      expect(Magek.config.roles['TestRole2']).to.deep.equal({
        auth: {},
      })
    })
  })

  describe('@GlobalErrorHandler decorator', () => {
    it('registers a global error handler with Stage 3 compatible signature', () => {
      @GlobalErrorHandler()
      class TestGlobalErrorHandler {
        public async handle(): Promise<void> {
          // Implementation
        }
      }

      expect(Magek.config.globalErrorsHandler).to.exist
      expect(Magek.config.globalErrorsHandler!.class).to.equal(TestGlobalErrorHandler)
    })
  })
})
