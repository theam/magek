 
 
 
import { expect } from '../expect'
import { Notification, partitionKey } from '../../src/decorators'
import { Magek } from '../../src'
import { field } from '../../src'

describe('the `Notification` decorator', () => {
  afterEach(() => {
    Magek.configureCurrentEnv((config: any) => {
      config.registry.notifications = {}
      config.registry.topicToEvent = {}
    })
  })

  it('add the event class as an event', () => {
    @Notification()
    class ANotification {
      public constructor() {}
    }
    expect(Magek.config.registry.notifications[ANotification.name]).to.deep.equal({
      class: ANotification,
    })
  })

  it('sets the topic in the config, if specified', () => {
    @Notification({ topic: 'my-topic' })
    class ANotification {
      public constructor() {}
    }

    expect(Magek.config.registry.notifications[ANotification.name]).to.deep.equal({
      class: ANotification,
    })

    expect(Magek.config.registry.topicToEvent['my-topic']).to.deep.equal(ANotification.name)
  })

  it('sets the partitionKey in the config, if specified', () => {
    @Notification()
    class ANotification {
      @partitionKey
      @field()
      public readonly key!: string
    }

    expect(Magek.config.registry.notifications[ANotification.name]).to.deep.equal({
      class: ANotification,
    })

    expect(Magek.config.registry.partitionKeys[ANotification.name]).to.equal('key')
  })
})
