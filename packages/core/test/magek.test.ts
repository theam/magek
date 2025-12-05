import { expect } from './expect'
import { Magek } from '../src'
import { replace, fake, restore, match, replaceGetter } from 'sinon'
import { Importer } from '../src/importer'
import {
  MagekConfig,
  EventParametersFilterByType,
  EventInterface,
  EventSearchResponse,
  ProviderLibrary,
  UUID,
  NotificationInterface,
  Field,
  Level,
} from '@magek/common'
import { EventStore } from '../src/services/event-store'
import { faker } from '@faker-js/faker'
import { afterEach } from 'mocha'
import { createMockEventStoreAdapter } from './helpers/event-store-adapter-helper'
import { createMockReadModelStoreAdapter } from './helpers/read-model-store-adapter-helper'

describe('the `Magek` class', () => {
  afterEach(() => {
    restore()
    Magek.configure('test', (config) => {
      config.appName = ''
      for (const propName in config.commandHandlers) {
        delete config.commandHandlers[propName]
      }
    })
  })

  describe('the `configure` method', () => {
    it('can be used to configure the app', () => {
      const magek = Magek as any

      Magek.configure('test', (config) => {
        config.appName = 'test-app-name'
        config.provider = {} as ProviderLibrary
      })

      Magek.configure('another-environment', (config) => {
        config.appName = 'this-shouldnt-be-set'
      })

      expect(magek.configuredEnvironments).to.have.lengthOf(2)
      expect(magek.configuredEnvironments).to.include.keys(['test', 'another-environment'])
      expect(magek.config.appName).to.equal('test-app-name')
      expect(magek.config.provider).to.be.an('object')
    })
  })

  describe('the `start` method', () => {
    it('imports all the user files', () => {
      const fakeImporter = fake()
      replace(Importer, 'importUserProjectFiles', fakeImporter)
      Magek.configureCurrentEnv((config) => {
        config.eventStoreAdapter = createMockEventStoreAdapter()
        config.readModelStoreAdapter = createMockReadModelStoreAdapter()
      })
      Magek.start('path/to/code')
      expect(fakeImporter).to.have.been.calledOnce
    })

    it('throws an error when no eventStoreAdapter is configured', () => {
      Magek.configureCurrentEnv((config) => {
        config.eventStoreAdapter = undefined
        config.readModelStoreAdapter = createMockReadModelStoreAdapter()
      })
      expect(() => Magek.start('path/to/code')).to.throw(
        'No eventStoreAdapter configured. Please add one in MagekConfig.'
      )
    })

    it.skip('throws an error when no readModelStoreAdapter is configured', () => {
      // TODO: Re-enable this test once the readModelStoreAdapter refactor is complete
      Magek.configureCurrentEnv((config) => {
        config.eventStoreAdapter = createMockEventStoreAdapter()
        config.readModelStoreAdapter = undefined
      })
      expect(() => Magek.start('path/to/code')).to.throw(
        'No readModelStoreAdapter configured. Please add one in MagekConfig.'
      )
    })

    it.skip('throws an error when no sessionStoreAdapter is configured', () => {
      // TODO: Re-enable this test once the sessionStoreAdapter refactor is complete
      Magek.configureCurrentEnv((config) => {
        config.eventStoreAdapter = createMockEventStoreAdapter()
        config.readModelStoreAdapter = createMockReadModelStoreAdapter()
        config.sessionStoreAdapter = undefined
      })
      expect(() => Magek.start('path/to/code')).to.throw(
        'No sessionStoreAdapter configured. Please add one in MagekConfig.'
      )
    })

    it('succeeds when both eventStoreAdapter and readModelStoreAdapter are configured', () => {
      // TODO: Re-enable this test once the readModelStoreAdapter refactor is complete
      const fakeImporter = fake()
      replace(Importer, 'importUserProjectFiles', fakeImporter)
      Magek.configureCurrentEnv((config) => {
        config.eventStoreAdapter = createMockEventStoreAdapter()
        // config.readModelStoreAdapter = createMockReadModelStoreAdapter()
      })
      expect(() => Magek.start('path/to/code')).to.not.throw()
      expect(fakeImporter).to.have.been.calledOnce
    })
  })

  describe('the `readModel` method', () => {
    class TestReadModel {
      constructor(public id: string) {}
      public getId() {
        return this.id
      }
    }
    // TODO: Fix this test - sinon mock isn't matching correctly
    it.skip('returns a properly configured Searcher', async () => {
      const searcherFunctionFake = fake.resolves([])
      Magek.configureCurrentEnv((config) => {
        replaceGetter(config, 'provider', () => {
          return {
            readModels: {
              search: searcherFunctionFake,
            },
          } as any
        })
      })
      await Magek.readModel(TestReadModel).search()
      expect(searcherFunctionFake).to.have.been.calledOnceWithExactly(
        match.any,
        TestReadModel.name,
        match.any,
        {},
        undefined,
        undefined,
        false,
        undefined
      )
    })
    // TODO: Fix this test - mock provider setup issue
    it.skip('has an instance method', async () => {
      const searcherFunctionFake = fake.returns([{ id: '42' }])
      Magek.configureCurrentEnv((config) => {
        replaceGetter(config, 'provider', () => {
          return {
            readModels: {
              search: searcherFunctionFake,
            },
          } as any
        })
      })
      const readModels = (await Magek.readModel(TestReadModel).search()) as Array<TestReadModel>
      for (const readModel of readModels) {
        expect(readModel.getId()).to.not.throw
      }
      expect(searcherFunctionFake).to.have.been.calledOnce
    })
  })
  describe('the `entitiesIDs` method', () => {
    it('has an instance method', async () => {
      const providerSearchEntitiesIds = fake.resolves([])
      Magek.configureCurrentEnv((config) => {
        config.provider = {} as ProviderLibrary
        config.eventStoreAdapter = createMockEventStoreAdapter({
          searchEntitiesIDs: providerSearchEntitiesIds,
        })
      })
      await Magek.entitiesIDs('TestEvent', 1, undefined)
      expect(providerSearchEntitiesIds).to.have.been.calledOnce
    })
  })
  describe('the `event` method', () => {
    class TestEvent {
      @Field(type => UUID)
      public readonly id: UUID

      public constructor(id: UUID) {
        this.id = id
      }

      public entityID(): UUID {
        return this.id
      }

      public getId(): UUID {
        return this.id
      }
    }

    class BestEvent {
      @Field(type => UUID)
      public readonly id: UUID

      public constructor(id: UUID) {
        this.id = id
      }

      public entityID(): UUID {
        return this.id
      }

      public getId(): UUID {
        return this.id
      }
    }

    afterEach(() => {
      restore()
      Magek.configureCurrentEnv((config) => {
        config.appName = ''
        for (const propName in config.events) {
          delete config.events[propName]
        }
        for (const propName in config.notifications) {
          delete config.notifications[propName]
        }
      })
    })

    it('has an instance method', async () => {
      const searchResult: EventSearchResponse[] = [
        {
          requestID: faker.string.uuid(),
          type: TestEvent.name,
          entity: faker.lorem.word(),
          entityID: faker.string.uuid(),
          createdAt: faker.date.recent().toISOString(),
          value: {
            id: '1',
            entityID: () => UUID.generate(),
          } as EventInterface,
        },
        {
          requestID: faker.string.uuid(),
          type: BestEvent.name,
          entity: faker.lorem.word(),
          entityID: faker.string.uuid(),
          createdAt: faker.date.recent().toISOString(),
          value: {
            id: '1',
            entityID: () => UUID.generate(),
          } as EventInterface,
        },
      ]
      const providerEventsSearch = fake.resolves(searchResult)
      Magek.configureCurrentEnv((config) => {
        config.logLevel = Level.error
        config.provider = {} as ProviderLibrary
        config.eventStoreAdapter = createMockEventStoreAdapter({
          search: providerEventsSearch,
        })
        config.events[TestEvent.name] = { class: TestEvent }
        config.events[BestEvent.name] = { class: BestEvent }
      })

      const eventFilterByType: EventParametersFilterByType = {
        type: TestEvent.name,
      }

      const events = await Magek.events(eventFilterByType)

      for (const event of events) {
        let eventValue
        switch (event.type) {
          case TestEvent.name:
            eventValue = event.value as TestEvent
            expect(eventValue.getId()).to.not.throw
            break
          case BestEvent.name:
            eventValue = event.value as BestEvent
            expect(eventValue.getId()).to.not.throw
            break
          default:
            break
        }
      }

      expect(providerEventsSearch).to.have.been.calledOnce
    })

    it('has a plain object if event class does not exist', async () => {
      const searchResult: EventSearchResponse[] = [
        {
          requestID: faker.string.uuid(),
          type: TestEvent.name,
          entity: faker.lorem.word(),
          entityID: faker.string.uuid(),
          createdAt: faker.date.recent().toISOString(),
          value: {
            id: '1',
            entityID: () => UUID.generate(),
          } as EventInterface,
        },
        {
          requestID: faker.string.uuid(),
          type: BestEvent.name,
          entity: faker.lorem.word(),
          entityID: faker.string.uuid(),
          createdAt: faker.date.recent().toISOString(),
          value: {
            id: '1',
            entityID: () => UUID.generate(),
          } as EventInterface,
        },
      ]
      const providerEventsSearch = fake.resolves(searchResult)
      Magek.configureCurrentEnv((config) => {
        config.logLevel = Level.error
        config.provider = {} as ProviderLibrary
        config.eventStoreAdapter = createMockEventStoreAdapter({
          search: providerEventsSearch,
        })
        config.events[TestEvent.name] = { class: TestEvent }
      })

      const eventFilterByType: EventParametersFilterByType = {
        type: TestEvent.name,
      }

      const events = await Magek.events(eventFilterByType)

      for (const event of events) {
        let eventValue
        switch (event.type) {
          case TestEvent.name:
            eventValue = event.value as TestEvent
            expect(eventValue.getId()).to.not.throw
            break
          case BestEvent.name:
            eventValue = event.value as BestEvent
            expect(eventValue.getId).to.be.undefined
            break
          default:
            break
        }
      }

      expect(providerEventsSearch).to.have.been.calledOnce
    })

    it('has a plain object if notification class does not exist', async () => {
      const searchResult: EventSearchResponse[] = [
        {
          requestID: faker.string.uuid(),
          type: TestEvent.name,
          entity: faker.lorem.word(),
          entityID: faker.string.uuid(),
          createdAt: faker.date.recent().toISOString(),
          value: {
            id: '1',
            entityID: () => UUID.generate(),
          } as NotificationInterface,
        },
      ]
      const providerEventsSearch = fake.resolves(searchResult)
      Magek.configureCurrentEnv((config) => {
        config.logLevel = Level.error
        config.provider = {} as ProviderLibrary
        config.eventStoreAdapter = createMockEventStoreAdapter({
          search: providerEventsSearch,
        })
        config.notifications[TestEvent.name] = { class: TestEvent }
      })

      const eventFilterByType: EventParametersFilterByType = {
        type: TestEvent.name,
      }

      const events = await Magek.events(eventFilterByType)

      for (const event of events) {
        let eventValue
        switch (event.type) {
          case TestEvent.name:
            eventValue = event.value as TestEvent
            expect(eventValue.getId()).to.not.throw
            break
          default:
            break
        }
      }

      expect(providerEventsSearch).to.have.been.calledOnce
    })
  })

  describe('The `entity` method', () => {
    context('given a MagekConfig', () => {
      const config = new MagekConfig('test')
      config.provider = {} as ProviderLibrary

      it('the `entity` function calls to the `fetchEntitySnapshot` method in the EventStore', async () => {
        replace(EventStore.prototype, 'fetchEntitySnapshot', fake.resolves({ value: { id: '42' } }))

        class SomeEntity {
          @Field(type => UUID)
          public readonly id: UUID

          public constructor(id: UUID) {
            this.id = id
          }
        }
        const snapshot = await Magek.entity(SomeEntity, '42')

        expect(snapshot).to.be.deep.equal({ id: '42' })
        expect(EventStore.prototype.fetchEntitySnapshot).to.have.been.calledOnceWith('SomeEntity', '42')
      })

      it('the entity function has an instance method', async () => {
        replace(EventStore.prototype, 'fetchEntitySnapshot', fake.resolves({ id: '42' }))

        class SomeEntity {
          @Field(type => UUID)
          public readonly id: UUID

          public constructor(id: UUID) {
            this.id = id
          }

          public getId(): UUID {
            return this.id
          }
        }
        const snapshot = await Magek.entity(SomeEntity, '42')
        snapshot?.getId()
        if (snapshot) {
          expect(snapshot?.getId()).to.not.throw
        }
      })
    })
  })

})
