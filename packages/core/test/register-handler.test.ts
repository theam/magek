import { expect } from './expect'
import { Register, MagekConfig, Level, UserEnvelope, UUID, field } from '@magek/common'
import { replace, fake, restore, spy } from 'sinon'
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

    replace(Date.prototype, 'toISOString', fake.returns('just the right time'))

    const register = new Register('1234', {} as any, RegisterHandler.flush)
    const event1 = new SomeEvent('a')
    const event2 = new SomeEvent('b')
    register.events(event1, event2)

    await RegisterHandler.handle(config, register)

    expect(mockStore).to.have.been.calledOnce
    expect(mockStore).to.have.been.calledWithMatch(
      [
        {
          currentUser: undefined,
          entityID: '42',
          entityTypeName: 'SomeEntity',
          kind: 'event',
          superKind: 'domain',
          requestID: '1234',
          typeName: 'SomeEvent',
          value: event1,
          version: 1,
        },
        {
          currentUser: undefined,
          entityID: '42',
          entityTypeName: 'SomeEntity',
          kind: 'event',
          superKind: 'domain',
          requestID: '1234',
          typeName: 'SomeEvent',
          value: event2,
          version: 1,
        },
      ],
      config
    )
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
    expect(registerHandler.wrapEvent(config, event, register)).to.deep.equal({
      version: 1,
      kind: 'event',
      superKind: 'domain',
      entityID: '42',
      requestID: '1234',
      entityTypeName: 'SomeEntity',
      value: event,
      currentUser: user,
      typeName: 'SomeEvent',
    })
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
    expect(registerHandler.wrapEvent(config, notification, register)).to.deep.equal({
      version: 1,
      kind: 'event',
      superKind: 'domain',
      entityID: 'default',
      requestID: '1234',
      entityTypeName: 'defaultTopic',
      value: notification,
      currentUser: user,
      typeName: SomeNotification.name,
    })
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
    expect(registerHandler.wrapEvent(config, event, register)).to.deep.equal({
      version: 1,
      kind: 'event',
      superKind: 'magek',
      entityTypeName: 'oldEntity',
      entityID: 'oldEntityId',
      requestID: '1234',
      value: event,
      currentUser: user,
      typeName: 'MagekEntityMigrated',
    })
  })
})
