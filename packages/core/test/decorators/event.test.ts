 
 
 
import { expect } from '../expect'
import { Event } from '../../src/decorators'
import { UUID } from '@magek/common'
import { field } from '../../src'
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
