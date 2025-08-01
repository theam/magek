 
import { expect } from './helpers/expect'
import { SchemaMigrationMetadata, ProviderLibrary, BoosterConfig, EventStoreAdapter, ReadModelStoreAdapter } from '../src'

describe('the config type', () => {
  describe('resourceNames', () => {
    it('fails to get if the app name is empty', () => {
      const cfg = new BoosterConfig('test')
      cfg.appName = ''
      expect(() => cfg.resourceNames).to.throw()
    })

    it('gets the application stack name from the app name', () => {
      const names = ['app1', 'test']
      for (const appName of names) {
        const cfg = new BoosterConfig('test')
        cfg.appName = appName
        expect(cfg.resourceNames.applicationStack).to.equal(`${appName}-app`)
      }
    })

    it('gets the events store name from the app name', () => {
      const names = ['app1', 'test']
      for (const appName of names) {
        const cfg = new BoosterConfig('test')
        cfg.appName = appName
        expect(cfg.resourceNames.eventsStore).to.equal(`${appName}-app-events-store`)
      }
    })

    it('gets well-formatted readmodel names, based on the application name', () => {
      const names = [
        { app: 'app1', read: 'rm1' },
        { app: 'test', read: 'model' },
      ]
      for (const { app, read } of names) {
        const cfg = new BoosterConfig('test')
        cfg.appName = app
        expect(cfg.resourceNames.forReadModel(read)).to.equal(`${app}-app-${read}`)
      }
    })
  })

  describe('thereAreRoles', () => {
    it('returns true when there are roles defined', () => {
      const config = new BoosterConfig('test')
      config.roles['test-role'] = {
        auth: {
          signUpMethods: [],
        },
      }

      expect(config.thereAreRoles).to.be.equal(true)
    })

    it('returns false when there are no roles defined', () => {
      const config = new BoosterConfig('test')
      expect(config.thereAreRoles).to.be.equal(false)
    })
  })

  describe('currentVersionFor', () => {
    it('returns 1 when the concept does not have any migration defined', () => {
      const config = new BoosterConfig('test')
      const schemaMigrations = new Map()
      schemaMigrations.set(2, {} as any)
      config.schemaMigrations['concept-with-migrations'] = schemaMigrations

      expect(config.currentVersionFor('concept-without-migration')).to.be.equal(1)
    })

    it('returns the version of the latest schema migration', () => {
      class SchemaTest {}
      class SchemaMigrationClassTest {}
      const config = new BoosterConfig('test')
      const schemaMigrations = new Map<number, SchemaMigrationMetadata>()
      schemaMigrations.set(3, {
        fromSchema: SchemaTest,
        toSchema: SchemaTest,
        methodName: 'method3',
        migrationClass: SchemaMigrationClassTest,
        toVersion: 3,
      })
      schemaMigrations.set(2, {
        fromSchema: SchemaTest,
        toSchema: SchemaTest,
        methodName: 'method2',
        migrationClass: SchemaMigrationClassTest,
        toVersion: 2,
      })
      config.schemaMigrations['concept'] = schemaMigrations

      expect(config.currentVersionFor('concept')).to.be.equal(3)
    })
  })

  describe('validate', () => {
    it('throws when there are gaps in the migration versions for a concept', () => {
      const config = new BoosterConfig('test')
      config.provider = {} as ProviderLibrary
      const schemaMigrations = new Map()
      schemaMigrations.set(3, {} as any)
      schemaMigrations.set(2, {} as any)
      schemaMigrations.set(5, {} as any)
      config.schemaMigrations['concept'] = schemaMigrations

      expect(() => config.validate()).to.throw(/Schema Migrations for 'concept' are invalid/)
    })

    it('does not throw when there are no gaps in the migration versions for a concept', () => {
      const config = new BoosterConfig('test')
      config.provider = {} as ProviderLibrary
      const schemaMigrations = new Map()
      schemaMigrations.set(4, {} as any)
      schemaMigrations.set(2, {} as any)
      schemaMigrations.set(3, {} as any)
      config.schemaMigrations['concept'] = schemaMigrations

      expect(() => config.validate()).to.not.throw()
    })
  })

  describe('provider', () => {
    it('throws when there is no provider set', () => {
      const config = new BoosterConfig('test')

      expect(() => config.provider).to.throw(/set a valid provider runtime/)
    })

    it('does not throw when there is a provider set', () => {
      const config = new BoosterConfig('test')
      config.provider = {} as ProviderLibrary

      expect(() => config.provider).to.not.throw()
    })

    it('does not set eventStoreAdapter when provider is set (direct assignment required)', () => {
      const config = new BoosterConfig('test')
      const mockProvider = {} as ProviderLibrary

      config.provider = mockProvider

      expect(config.eventStoreAdapter).to.be.undefined
    })

    it('allows eventStoreAdapter to be set directly', () => {
      const config = new BoosterConfig('test')
      const mockEventStoreAdapter = {} as EventStoreAdapter

      config.eventStoreAdapter = mockEventStoreAdapter

      expect(config.eventStoreAdapter).to.equal(mockEventStoreAdapter)
    })

    it('eventStoreAdapter remains unchanged when provider is set after direct assignment', () => {
      const config = new BoosterConfig('test')
      const directlySetAdapter = {} as EventStoreAdapter
      const mockProvider = {} as ProviderLibrary

      // First set directly
      config.eventStoreAdapter = directlySetAdapter
      expect(config.eventStoreAdapter).to.equal(directlySetAdapter)

      // Then set provider - should NOT overwrite
      config.provider = mockProvider
      expect(config.eventStoreAdapter).to.equal(directlySetAdapter)
    })
  })

  describe('readModelStoreAdapter', () => {
    it.skip('throws when there is no readModelStoreAdapter set', () => {
      // TODO: Re-enable this test once the readModelStoreAdapter refactor is complete
      const config = new BoosterConfig('test')

      expect(() => config.readModelStore).to.throw(/ReadModelStoreAdapter is not configured/)
    })

    it('does not throw when there is a readModelStoreAdapter set', () => {
      const config = new BoosterConfig('test')
      config.readModelStoreAdapter = {} as ReadModelStoreAdapter

      expect(() => config.readModelStore).to.not.throw()
    })

    it('allows readModelStoreAdapter to be set directly', () => {
      const config = new BoosterConfig('test')
      const mockReadModelStoreAdapter = {} as ReadModelStoreAdapter

      config.readModelStoreAdapter = mockReadModelStoreAdapter

      expect(config.readModelStoreAdapter).to.equal(mockReadModelStoreAdapter)
    })
  })
})
