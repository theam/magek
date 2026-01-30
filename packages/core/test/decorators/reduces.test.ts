import { expect } from '../expect'
import { Event, Entity, reduces } from '../../src/decorators/'
import { Magek } from '../../src'
import { UUID, MagekConfig } from '@magek/common'
import { field } from '../../src'

describe('the `reduces` decorator', () => {
  afterEach(() => {
    Magek.configureCurrentEnv((config: MagekConfig) => {
      for (const propName in config.reducers) {
        delete config.reducers[propName]
      }
      for (const propName in config.entities) {
        delete config.entities[propName]
      }
      for (const propName in config.events) {
        delete config.events[propName]
      }
    })
  })

  it('registers the reducer metadata in config.reducers with class and methodName', () => {
    @Event
    class ItemAdded {
      @field()
      public readonly itemId!: string

      public entityID(): UUID {
        return this.itemId
      }
    }

    @Entity
    class Cart {
      @field(type => UUID)
      public readonly id!: UUID

      @field()
      public readonly items!: string[]

      @reduces(ItemAdded)
      public static addItem(_event: ItemAdded): Cart {
        throw new Error('Not implemented')
      }
    }

    const reducerMetadata = Magek.config.reducers['ItemAdded']

    expect(reducerMetadata).to.be.an('object')
    expect(reducerMetadata.class).to.equal(Cart)
    expect(reducerMetadata.methodName).to.equal('addItem')
  })

  it('allows multiple entities to reduce different events', () => {
    @Event
    class OrderCreated {
      @field()
      public readonly orderId!: string

      public entityID(): UUID {
        return this.orderId
      }
    }

    @Event
    class PaymentReceived {
      @field()
      public readonly paymentId!: string

      public entityID(): UUID {
        return this.paymentId
      }
    }

    @Entity
    class Order {
      @field(type => UUID)
      public readonly id!: UUID

      @reduces(OrderCreated)
      public static create(_event: OrderCreated): Order {
        throw new Error('Not implemented')
      }
    }

    @Entity
    class Payment {
      @field(type => UUID)
      public readonly id!: UUID

      @reduces(PaymentReceived)
      public static receive(_event: PaymentReceived): Payment {
        throw new Error('Not implemented')
      }
    }

    expect(Magek.config.reducers['OrderCreated'].class).to.equal(Order)
    expect(Magek.config.reducers['OrderCreated'].methodName).to.equal('create')
    expect(Magek.config.reducers['PaymentReceived'].class).to.equal(Payment)
    expect(Magek.config.reducers['PaymentReceived'].methodName).to.equal('receive')
  })

  it('throws an error when the same event is reduced by multiple methods', () => {
    @Event
    class DuplicateEvent {
      @field()
      public readonly id!: string

      public entityID(): UUID {
        return this.id
      }
    }

    @Entity
    class FirstEntity {
      @field(type => UUID)
      public readonly id!: UUID

      @reduces(DuplicateEvent)
      public static handle(_event: DuplicateEvent): FirstEntity {
        throw new Error('Not implemented')
      }
    }

    // Suppress unused variable warning
    void FirstEntity

    expect(() => {
      @Entity
      class SecondEntity {
        @field(type => UUID)
        public readonly id!: UUID

        @reduces(DuplicateEvent)
        public static handle(_event: DuplicateEvent): SecondEntity {
          throw new Error('Not implemented')
        }
      }
      // Force class to be used
      return SecondEntity
    }).to.throw(/already registered to be reduced/)
  })
})
