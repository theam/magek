 
 
 
import { expect } from '../expect.js'
import { Event } from '../../src/decorators'
import { UUID } from '@booster-ai/common'
import { Booster } from '../../src'

describe('the `Event` decorator', () => {
  it('add the event class as an event', () => {
    @Event
    class AnEvent {
      public constructor(readonly foo: string) {}
      public entityID(): UUID {
        return '123'
      }
    }
    expect(Booster.config.events['AnEvent']).to.deep.equal({
      class: AnEvent,
    })
  })
})
