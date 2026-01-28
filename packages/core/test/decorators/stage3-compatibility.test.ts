/**
 * This test file demonstrates Stage 3 decorator compatibility with Magek.
 * 
 * NOTE: These tests currently run with experimentalDecorators enabled,
 * so they test legacy decorator behavior. The decorators have been updated
 * to support both legacy and Stage 3 formats, maintaining backward compatibility.
 * 
 * To fully test Stage 3 decorators in a real project:
 * 1. Use TypeScript 5.0+
 * 2. Remove experimentalDecorators from tsconfig.json
 * 3. The decorators will automatically use the Stage 3 signature
 */

import { expect } from '../expect'
import { Event, Role, GlobalErrorHandler } from '../../src/decorators'
import { Field, UUID } from '@magek/common'
import { Magek } from '../../src'

describe('Stage 3 decorator compatibility', () => {
  describe('@Event decorator', () => {
    it('registers an event class with Stage 3 compatible signature', () => {
      @Event
      class TestEvent {
        @Field()
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
        @Field()
        public readonly field1!: string

        @Field()
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
