import { MagekConfig, EventSearchParameters, EventSearchResponse, field, Level } from '@magek/common'
import { eventSearch } from '../src/event-search'
import { fake, restore } from 'sinon'
import { expect } from './expect'
import { createMockEventStoreAdapter } from './helpers/event-store-adapter-helper'

class TestEvent {
  @field()
  public readonly id: string

  public constructor(id: string) {
    this.id = id
  }

  public entityID(): string {
    return this.id
  }
}

class TestNotification {
  @field()
  public readonly id: string

  public constructor(id: string) {
    this.id = id
  }
}

describe('eventSearch function', () => {
  afterEach(() => {
    restore()
  })

  it('instantiates event and notification classes for returned events', async () => {
    const config = new MagekConfig('test')
    config.logLevel = Level.error
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
    config.eventStoreAdapter = createMockEventStoreAdapter({ search: providerSearch })
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
