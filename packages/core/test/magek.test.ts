import { expect } from './expect'
import { Booster } from '../src'
import { replace, fake, restore, match, replaceGetter } from 'sinon'
import { Importer } from '../src/importer'
import {
  BoosterConfig,
  EventParametersFilterByType,
  EventInterface,
  EventSearchResponse,
  ProviderLibrary,
  UUID,
  NotificationInterface,
} from '@magek/common'
import { EventStore } from '../src/services/event-store'
import { faker } from '@faker-js/faker'
import { JwksUriTokenVerifier } from '../src/services/token-verifiers'
import { afterEach } from 'mocha'
import { createMockEventStoreAdapter } from './helpers/event-store-adapter-helper'
import { createMockReadModelStoreAdapter } from './helpers/read-model-store-adapter-helper'

describe('the `Booster` class', () => {
  afterEach(() => {
    restore()
    Booster.configure('test', (config) => {
      config.appName = ''
      for (const propName in config.commandHandlers) {
        delete config.commandHandlers[propName]
      }
    })
  })

  describe('the `configure` method', () => {
    it('can be used to configure the app', () => {
      const booster = Booster as any

      Booster.configure('test', (config) => {
        config.appName = 'test-app-name'
        config.provider = {} as ProviderLibrary
      })

      Booster.configure('another-environment', (config) => {
        config.appName = 'this-shouldnt-be-set'
      })

      expect(booster.configuredEnvironments).to.have.lengthOf(2)
      expect(booster.configuredEnvironments).to.include.keys(['test', 'another-environment'])
      expect(booster.config.appName).to.equal('test-app-name')
      expect(booster.config.provider).to.be.an('object')
    })
  })

  describe('the `start` method', () => {
    it('imports all the user files', () => {
      const fakeImporter = fake()
      replace(Importer, 'importUserProjectFiles', fakeImporter)
      Booster.configureCurrentEnv((config) => {
        config.eventStoreAdapter = createMockEventStoreAdapter()
        config.readModelStoreAdapter = createMockReadModelStoreAdapter()
      })
      Booster.start('path/to/code')
      expect(fakeImporter).to.have.been.calledOnce
    })

    it('throws an error when no eventStoreAdapter is configured', () => {
      Booster.configureCurrentEnv((config) => {
        config.eventStoreAdapter = undefined
        config.readModelStoreAdapter = createMockReadModelStoreAdapter()
      })
      expect(() => Booster.start('path/to/code')).to.throw(
        'No eventStoreAdapter configured. Please add one in BoosterConfig.'
      )
    })

    it.skip('throws an error when no readModelStoreAdapter is configured', () => {
      // TODO: Re-enable this test once the readModelStoreAdapter refactor is complete
      Booster.configureCurrentEnv((config) => {
        config.eventStoreAdapter = createMockEventStoreAdapter()
        config.readModelStoreAdapter = undefined
      })
      expect(() => Booster.start('path/to/code')).to.throw(
        'No readModelStoreAdapter configured. Please add one in BoosterConfig.'
      )
    })

    it.skip('throws an error when no sessionStoreAdapter is configured', () => {
      // TODO: Re-enable this test once the sessionStoreAdapter refactor is complete
      Booster.configureCurrentEnv((config) => {
        config.eventStoreAdapter = createMockEventStoreAdapter()
        config.readModelStoreAdapter = createMockReadModelStoreAdapter()
        config.sessionStoreAdapter = undefined
      })
      expect(() => Booster.start('path/to/code')).to.throw(
        'No sessionStoreAdapter configured. Please add one in BoosterConfig.'
      )
    })

    it('succeeds when both eventStoreAdapter and readModelStoreAdapter are configured', () => {
      // TODO: Re-enable this test once the readModelStoreAdapter refactor is complete
      const fakeImporter = fake()
      replace(Importer, 'importUserProjectFiles', fakeImporter)
      Booster.configureCurrentEnv((config) => {
        config.eventStoreAdapter = createMockEventStoreAdapter()
        // config.readModelStoreAdapter = createMockReadModelStoreAdapter()
      })
      expect(() => Booster.start('path/to/code')).to.not.throw()
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
    it('returns a properly configured Searcher', async () => {
      const searcherFunctionFake = fake.resolves([])
      Booster.configureCurrentEnv((config) => {
        replaceGetter(config, 'provider', () => {
          return {
            readModels: {
              search: searcherFunctionFake,
            },
          } as any
        })
      })
      await Booster.readModel(TestReadModel).search()
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
    it('has an instance method', async () => {
      const searcherFunctionFake = fake.returns([{ id: '42' }])
      Booster.configureCurrentEnv((config) => {
        replaceGetter(config, 'provider', () => {
          return {
            readModels: {
              search: searcherFunctionFake,
            },
          } as any
        })
      })
      const readModels = (await Booster.readModel(TestReadModel).search()) as Array<TestReadModel>
      for (const readModel of readModels) {
        expect(readModel.getId()).to.not.throw
      }
      expect(searcherFunctionFake).to.have.been.calledOnce
    })
  })
  describe('the `entitiesIDs` method', () => {
    it('has an instance method', async () => {
      const providerSearchEntitiesIds = fake.resolves([])
      Booster.configureCurrentEnv((config) => {
        config.provider = {} as ProviderLibrary
        config.eventStoreAdapter = createMockEventStoreAdapter({
          searchEntitiesIDs: providerSearchEntitiesIds,
        })
      })
      await Booster.entitiesIDs('TestEvent', 1, undefined)
      expect(providerSearchEntitiesIds).to.have.been.calledOnce
    })
  })
  describe('the `event` method', () => {
    class TestEvent {
      public constructor(readonly id: UUID) {}
      public entityID(): UUID {
        return this.id
      }
      public getId(): UUID {
        return this.id
      }
    }
    class BestEvent {
      public constructor(readonly id: UUID) {}
      public entityID(): UUID {
        return this.id
      }
      public getId(): UUID {
        return this.id
      }
    }

    afterEach(() => {
      restore()
      Booster.configureCurrentEnv((config) => {
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
          requestID: faker.datatype.uuid(),
          type: TestEvent.name,
          entity: faker.lorem.word(),
          entityID: faker.datatype.uuid(),
          createdAt: faker.date.recent().toISOString(),
          value: {
            id: '1',
            entityID: () => UUID.generate(),
          } as EventInterface,
        },
        {
          requestID: faker.datatype.uuid(),
          type: BestEvent.name,
          entity: faker.lorem.word(),
          entityID: faker.datatype.uuid(),
          createdAt: faker.date.recent().toISOString(),
          value: {
            id: '1',
            entityID: () => UUID.generate(),
          } as EventInterface,
        },
      ]
      const providerEventsSearch = fake.resolves(searchResult)
      Booster.configureCurrentEnv((config) => {
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

      const events = await Booster.events(eventFilterByType)

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
          requestID: faker.datatype.uuid(),
          type: TestEvent.name,
          entity: faker.lorem.word(),
          entityID: faker.datatype.uuid(),
          createdAt: faker.date.recent().toISOString(),
          value: {
            id: '1',
            entityID: () => UUID.generate(),
          } as EventInterface,
        },
        {
          requestID: faker.datatype.uuid(),
          type: BestEvent.name,
          entity: faker.lorem.word(),
          entityID: faker.datatype.uuid(),
          createdAt: faker.date.recent().toISOString(),
          value: {
            id: '1',
            entityID: () => UUID.generate(),
          } as EventInterface,
        },
      ]
      const providerEventsSearch = fake.resolves(searchResult)
      Booster.configureCurrentEnv((config) => {
        config.provider = {} as ProviderLibrary
        config.eventStoreAdapter = createMockEventStoreAdapter({
          search: providerEventsSearch,
        })
        config.events[TestEvent.name] = { class: TestEvent }
      })

      const eventFilterByType: EventParametersFilterByType = {
        type: TestEvent.name,
      }

      const events = await Booster.events(eventFilterByType)

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
          requestID: faker.datatype.uuid(),
          type: TestEvent.name,
          entity: faker.lorem.word(),
          entityID: faker.datatype.uuid(),
          createdAt: faker.date.recent().toISOString(),
          value: {
            id: '1',
            entityID: () => UUID.generate(),
          } as NotificationInterface,
        },
      ]
      const providerEventsSearch = fake.resolves(searchResult)
      Booster.configureCurrentEnv((config) => {
        config.provider = {} as ProviderLibrary
        config.eventStoreAdapter = createMockEventStoreAdapter({
          search: providerEventsSearch,
        })
        config.notifications[TestEvent.name] = { class: TestEvent }
      })

      const eventFilterByType: EventParametersFilterByType = {
        type: TestEvent.name,
      }

      const events = await Booster.events(eventFilterByType)

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
    context('given a BoosterConfig', () => {
      const config = new BoosterConfig('test')
      config.provider = {} as ProviderLibrary

      it('the `entity` function calls to the `fetchEntitySnapshot` method in the EventStore', async () => {
        replace(EventStore.prototype, 'fetchEntitySnapshot', fake.resolves({ value: { id: '42' } }))

        class SomeEntity {
          public constructor(readonly id: UUID) {}
        }
        const snapshot = await Booster.entity(SomeEntity, '42')

        expect(snapshot).to.be.deep.equal({ id: '42' })
        expect(EventStore.prototype.fetchEntitySnapshot).to.have.been.calledOnceWith('SomeEntity', '42')
      })

      it('the entity function has an instance method', async () => {
        replace(EventStore.prototype, 'fetchEntitySnapshot', fake.resolves({ id: '42' }))

        class SomeEntity {
          public constructor(readonly id: UUID) {}
          public getId(): UUID {
            return this.id
          }
        }
        const snapshot = await Booster.entity(SomeEntity, '42')
        snapshot?.getId()
        if (snapshot) {
          expect(snapshot?.getId()).to.not.throw
        }
      })
    })
  })

  describe('The `loadTokenVerifierFromEnv` function', () => {
    context('when the JWT_ENV_VARS are set', () => {
      beforeEach(() => {
        process.env.BOOSTER_JWT_ISSUER = 'BOOSTER_JWT_ISSUER_VALUE'
        process.env.BOOSTER_JWKS_URI = 'BOOSTER_JWKS_URI_VALUE'
        process.env.BOOSTER_ROLES_CLAIM = 'BOOSTER_ROLES_CLAIM_VALUE'
      })

      afterEach(() => {
        delete process.env.BOOSTER_JWT_ISSUER
        delete process.env.BOOSTER_JWKS_URI
        delete process.env.BOOSTER_ROLES_CLAIM

        Booster.config.tokenVerifiers = []
      })

      it('does alter the token verifiers config', () => {
        expect(Booster.config.tokenVerifiers).to.be.empty

        const booster = Booster as any
        booster.loadTokenVerifierFromEnv()

        const tokenVerifierConfig = Booster.config.tokenVerifiers
        expect(tokenVerifierConfig.length).to.be.equal(1)
        expect(tokenVerifierConfig[0]).to.be.an.instanceOf(JwksUriTokenVerifier)
        expect((tokenVerifierConfig[0] as JwksUriTokenVerifier).issuer).to.be.equal('BOOSTER_JWT_ISSUER_VALUE')
        expect((tokenVerifierConfig[0] as JwksUriTokenVerifier).jwksUri).to.be.equal('BOOSTER_JWKS_URI_VALUE')
        expect((tokenVerifierConfig[0] as JwksUriTokenVerifier).rolesClaim).to.be.equal('BOOSTER_ROLES_CLAIM_VALUE')
      })
    })

    context('when the JWT_ENV_VARS are not set', () => {
      it('does not alter the token verifiers config', () => {
        expect(Booster.config.tokenVerifiers).to.be.empty

        const booster = Booster as any
        booster.loadTokenVerifierFromEnv()

        expect(Booster.config.tokenVerifiers).to.be.empty
      })
    })
  })
})
