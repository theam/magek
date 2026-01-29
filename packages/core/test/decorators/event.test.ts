 
 
 
import { expect } from '../expect'
import { Event } from '../../src/decorators'
import { UUID, field } from '@magek/common'
import { Magek } from '../../src'

describe('the `Event` decorator', () => {
  it('add the event class as an event', () => {
    @Event
    class AnEvent {
      @field()
      public readonly foo!: string

      public entityID(): UUID {
        return '123'
      }
    }
    expect(Magek.config.events['AnEvent']).to.deep.equal({
      class: AnEvent,
    })
  })
})
