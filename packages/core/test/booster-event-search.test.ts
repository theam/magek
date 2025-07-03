import { BoosterConfig, EventSearchParameters, EventSearchResponse } from '@booster-ai/common'
import { eventSearch } from '../src/booster-event-search.js'
import { fake, restore } from 'sinon'
import { expect } from './expect.js'

class TestEvent {
  public constructor(readonly id: string) {}
  public entityID(): string {
    return this.id
  }
}

class TestNotification {
  public constructor(readonly id: string) {}
}

describe('eventSearch function', () => {
  afterEach(() => {
    restore()
  })

  it('instantiates event and notification classes for returned events', async () => {
    const config = new BoosterConfig('test')
    const providerSearch = fake.resolves([
      {
        requestID: '1',
        type: TestEvent.name,
        entity: 'TestEntity',
        entityID: '42',
        createdAt: 'now',
        value: { id: 'e1', entityID: () => '42' },
      } as EventSearchResponse,
      {
        requestID: '2',
        type: TestNotification.name,
        entity: 'TestEntity',
        entityID: '42',
        createdAt: 'now',
        value: { id: 'n1' },
      } as EventSearchResponse,
      {
        requestID: '3',
        type: 'Unknown',
        entity: 'TestEntity',
        entityID: '42',
        createdAt: 'now',
        value: { id: 'u1' },
      } as EventSearchResponse,
    ])
    config.provider = { events: { search: providerSearch } } as any
    config.events[TestEvent.name] = { class: TestEvent }
    config.notifications[TestNotification.name] = { class: TestNotification }

    const params = { entity: 'TestEntity' } as EventSearchParameters
    const result = await eventSearch(config, params)

    expect(providerSearch).to.have.been.calledOnceWithExactly(config, params)
    expect(result[0].value).to.be.instanceOf(TestEvent)
    expect(result[1].value).to.be.instanceOf(TestNotification)
    expect(result[2].value).to.deep.equal({ id: 'u1' })
  })
})
