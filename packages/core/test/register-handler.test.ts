import { expect } from './expect'
import { Register, MagekConfig, Level, UserEnvelope, UUID, resetTimestampGenerator } from '@magek/common'
import { field } from '../src'
import { fake, restore, spy } from 'sinon'
import { RegisterHandler } from '../src'
import { MagekEntityMigrated } from '../src/core-concepts/data-migration/events/entity-migrated'
import { createMockEventStoreAdapter } from './helpers/event-store-adapter-helper'

class SomeEntity {
  @field(type => UUID)
  public readonly id: UUID

  public constructor(id: UUID) {
    this.id = id
  }
}

class SomeEvent {
  @field()
  public readonly someField: string

  public constructor(someField: string) {
    this.someField = someField
  }

  entityID() {
    return '42'
  }
}

class SomeNotification {
  public constructor() {}
}

describe('the `RegisterHandler` class', () => {
  const testConfig = new MagekConfig('Test')
  testConfig.logLevel = Level.debug

  afterEach(() => {
    restore()
    resetTimestampGenerator()
  })

  it('handles a register', async () => {
    const config = new MagekConfig('test')
    const mockStore = fake()
    config.eventStoreAdapter = createMockEventStoreAdapter({
      store: mockStore,
    })
    config.reducers['SomeEvent'] = { class: SomeEntity, methodName: 'whatever' }

    const register = new Register('1234', {} as any, RegisterHandler.flush)
    const event1 = new SomeEvent('a')
    const event2 = new SomeEvent('b')
    register.events(event1, event2)

    const registerHandler = RegisterHandler as any
    spy(registerHandler, 'wrapEvent')

    await RegisterHandler.handle(config, register)

    expect(registerHandler.wrapEvent).to.have.been.calledTwice
    expect(registerHandler.wrapEvent).to.have.been.calledWith(config, event1, register)
    expect(registerHandler.wrapEvent).to.have.been.calledWith(config, event2, register)
    expect(config.eventStore.store).to.have.been.calledOnce
  })

  it('does nothing when there are no events', async () => {
    const config = new MagekConfig('test')
    const mockStore = fake()
    config.eventStoreAdapter = createMockEventStoreAdapter({
      store: mockStore,
    })
    config.reducers['SomeEvent'] = { class: SomeEntity, methodName: 'whatever' }

    const register = new Register('1234', {} as any, RegisterHandler.flush)
    await RegisterHandler.handle(config, register)

    expect(mockStore).to.not.have.been.called
  })

  it('stores wrapped events', async () => {
    const config = new MagekConfig('test')
    const mockStore = fake()
    config.eventStoreAdapter = createMockEventStoreAdapter({
      store: mockStore,
    })
    config.reducers['SomeEvent'] = {
      class: SomeEntity,
      methodName: 'aReducer',
    }

    const register = new Register('1234', {} as any, RegisterHandler.flush)
    const event1 = new SomeEvent('a')
    const event2 = new SomeEvent('b')
    register.events(event1, event2)

    await RegisterHandler.handle(config, register)

    expect(mockStore).to.have.been.calledOnce
    const [[events]] = mockStore.args
    expect(events).to.have.lengthOf(2)
    expect(events[0]).to.include({
      currentUser: undefined,
      entityID: '42',
      entityTypeName: 'SomeEntity',
      kind: 'event',
      superKind: 'domain',
      requestID: '1234',
      typeName: 'SomeEvent',
      version: 1,
    })
    expect(events[0].value).to.equal(event1)
    expect(events[0].createdAt).to.be.a('string')
    expect(events[1]).to.include({
      currentUser: undefined,
      entityID: '42',
      entityTypeName: 'SomeEntity',
      kind: 'event',
      superKind: 'domain',
      requestID: '1234',
      typeName: 'SomeEvent',
      version: 1,
    })
    expect(events[1].value).to.equal(event2)
    expect(events[1].createdAt).to.be.a('string')
  })

  it('can wrap events to produce eventEnvelopes', () => {
    const config = new MagekConfig('test')
    config.reducers['SomeEvent'] = {
      class: SomeEntity,
      methodName: 'someReducer',
    }
    const user: UserEnvelope = {
      username: 'paco@example.com',
      roles: ['Paco'],
      claims: {},
    }
    const register = new Register('1234', {} as any, RegisterHandler.flush, user)
    const event = new SomeEvent('a')

    const registerHandler = RegisterHandler as any
    const result = registerHandler.wrapEvent(config, event, register)
    expect(result).to.include({
      version: 1,
      kind: 'event',
      superKind: 'domain',
      entityID: '42',
      requestID: '1234',
      entityTypeName: 'SomeEntity',
      typeName: 'SomeEvent',
    })
    expect(result.value).to.equal(event)
    expect(result.currentUser).to.deep.equal(user)
    expect(result.createdAt).to.be.a('string')
  })

  it('can wrap notifications to produce eventEnvelopes', () => {
    const config = new MagekConfig('test')
    config.notifications[SomeNotification.name] = {
      class: SomeNotification,
    }

    const user: UserEnvelope = {
      username: 'paco@example.com',
      roles: ['Paco'],
      claims: {},
    }

    const register = new Register('1234', {} as any, RegisterHandler.flush, user)
    const notification = new SomeNotification()

    const registerHandler = RegisterHandler as any
    const result = registerHandler.wrapEvent(config, notification, register)
    expect(result).to.include({
      version: 1,
      kind: 'event',
      superKind: 'domain',
      entityID: 'default',
      requestID: '1234',
      entityTypeName: 'defaultTopic',
      typeName: SomeNotification.name,
    })
    expect(result.value).to.equal(notification)
    expect(result.currentUser).to.deep.equal(user)
    expect(result.createdAt).to.be.a('string')
  })

  it('can wrap internal events to produce eventEnvelopes', () => {
    const config = new MagekConfig('test')
    config.reducers['MagekEntityMigrated'] = {
      class: SomeEntity,
      methodName: 'someReducer',
    }
    const user: UserEnvelope = {
      username: 'paco@example.com',
      roles: ['Paco'],
      claims: {},
    }
    const register = new Register('1234', {}, RegisterHandler.flush, user)
    const someEntity = new SomeEntity('42')
    const event = new MagekEntityMigrated('oldEntity', 'oldEntityId', 'newEntityName', someEntity)

    const registerHandler = RegisterHandler as any
    const result = registerHandler.wrapEvent(config, event, register)
    expect(result).to.include({
      version: 1,
      kind: 'event',
      superKind: 'magek',
      entityTypeName: 'oldEntity',
      entityID: 'oldEntityId',
      requestID: '1234',
      typeName: 'MagekEntityMigrated',
    })
    expect(result.value).to.equal(event)
    expect(result.currentUser).to.deep.equal(user)
    expect(result.createdAt).to.be.a('string')
  })
})
