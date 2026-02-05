import { expect } from './helpers/expect'
import {
  MagekRegistry,
  CommandMetadata,
  EventMetadata,
  EntityMetadata,
  ReducerMetadata,
  QueryMetadata,
  ReadModelMetadata,
  NotificationMetadata,
  ScheduledCommandMetadata,
  DataMigrationMetadata,
  SchemaMigrationMetadata,
  UUID,
} from '../src'

describe('MagekRegistry', () => {
  let registry: MagekRegistry

  beforeEach(() => {
    registry = new MagekRegistry()
  })

  describe('registerCommand', () => {
    it('stores command metadata correctly', () => {
      const metadata: CommandMetadata = {
        name: 'CreateProduct',
        properties: [{ name: 'title', typeInfo: {} as any, dependencies: [] }],
        handler: async () => {},
        authorizer: async () => {},
        before: [],
        methods: [],
      }

      registry.registerCommand('CreateProduct', metadata)

      expect(registry.commandHandlers['CreateProduct']).to.equal(metadata)
    })

    it('throws on duplicate command name', () => {
      const metadata: CommandMetadata = {
        name: 'CreateProduct',
        properties: [],
        handler: async () => {},
        authorizer: async () => {},
        before: [],
        methods: [],
      }

      registry.registerCommand('CreateProduct', metadata)

      expect(() => registry.registerCommand('CreateProduct', metadata)).to.throw(
        /A command called CreateProduct is already registered/
      )
    })
  })

  describe('registerEvent', () => {
    it('stores event metadata correctly', () => {
      class TestEvent {
        entityID(): UUID {
          return 'test-id'
        }
      }
      const metadata: EventMetadata = { class: TestEvent }

      registry.registerEvent('TestEvent', metadata)

      expect(registry.events['TestEvent']).to.equal(metadata)
    })

    it('throws on duplicate event name', () => {
      class TestEvent {
        entityID(): UUID {
          return 'test-id'
        }
      }
      const metadata: EventMetadata = { class: TestEvent }

      registry.registerEvent('TestEvent', metadata)

      expect(() => registry.registerEvent('TestEvent', metadata)).to.throw(
        /A event called TestEvent is already registered/
      )
    })
  })

  describe('registerEntity', () => {
    it('stores entity metadata correctly', () => {
      class TestEntity {
        id: UUID = 'test-id'
      }
      const metadata: EntityMetadata = {
        class: TestEntity,
        eventStreamAuthorizer: async () => {},
      }

      registry.registerEntity('TestEntity', metadata)

      expect(registry.entities['TestEntity']).to.equal(metadata)
    })

    it('throws on duplicate entity name', () => {
      class TestEntity {
        id: UUID = 'test-id'
      }
      const metadata: EntityMetadata = {
        class: TestEntity,
        eventStreamAuthorizer: async () => {},
      }

      registry.registerEntity('TestEntity', metadata)

      expect(() => registry.registerEntity('TestEntity', metadata)).to.throw(
        /An entity called TestEntity is already registered/
      )
    })
  })

  describe('registerReducer', () => {
    it('stores reducer metadata correctly', () => {
      const metadata: ReducerMetadata = {
        class: class TestEntity {},
        methodName: 'reduceTestEvent',
      }

      registry.registerReducer('TestEvent', metadata)

      expect(registry.reducers['TestEvent']).to.equal(metadata)
    })

    it('throws on duplicate event name for reducer', () => {
      const metadata: ReducerMetadata = {
        class: class TestEntity {},
        methodName: 'reduceTestEvent',
      }

      registry.registerReducer('TestEvent', metadata)

      expect(() => registry.registerReducer('TestEvent', metadata)).to.throw(
        /Error registering reducer: The event TestEvent was already registered/
      )
    })
  })

  describe('registerQuery', () => {
    it('stores query metadata correctly', () => {
      const metadata = {
        name: 'GetProducts',
        properties: [],
        handler: async () => {},
        authorizer: async () => {},
        before: [],
        methods: [],
      } as unknown as QueryMetadata

      registry.registerQuery('GetProducts', metadata)

      expect(registry.queryHandlers['GetProducts']).to.equal(metadata)
    })

    it('throws on duplicate query name', () => {
      const metadata = {
        name: 'GetProducts',
        properties: [],
        handler: async () => {},
        authorizer: async () => {},
        before: [],
        methods: [],
      } as unknown as QueryMetadata

      registry.registerQuery('GetProducts', metadata)

      expect(() => registry.registerQuery('GetProducts', metadata)).to.throw(
        /A query called GetProducts is already registered/
      )
    })
  })

  describe('registerReadModel', () => {
    it('stores read model metadata correctly', () => {
      const metadata = {
        class: class TestReadModel {},
        properties: [],
        authorizer: async () => {},
        before: [],
      } as unknown as ReadModelMetadata

      registry.registerReadModel('TestReadModel', metadata)

      expect(registry.readModels['TestReadModel']).to.equal(metadata)
    })

    it('throws on duplicate read model name', () => {
      const metadata = {
        class: class TestReadModel {},
        properties: [],
        authorizer: async () => {},
        before: [],
      } as unknown as ReadModelMetadata

      registry.registerReadModel('TestReadModel', metadata)

      expect(() => registry.registerReadModel('TestReadModel', metadata)).to.throw(
        /A read model called TestReadModel is already registered/
      )
    })
  })

  describe('registerEventHandler', () => {
    it('stores event handler correctly', () => {
      const handler = { handle: async () => {} } as any

      registry.registerEventHandler('TestEvent', handler)

      expect(registry.eventHandlers['TestEvent']).to.deep.equal([handler])
    })

    it('deduplicates identical handler references', () => {
      const handler = { handle: async () => {} } as any

      registry.registerEventHandler('TestEvent', handler)
      registry.registerEventHandler('TestEvent', handler)

      expect(registry.eventHandlers['TestEvent']).to.have.length(1)
    })

    it('allows multiple different handlers for the same event', () => {
      const handler1 = { handle: async () => {} } as any
      const handler2 = { handle: async () => {} } as any

      registry.registerEventHandler('TestEvent', handler1)
      registry.registerEventHandler('TestEvent', handler2)

      expect(registry.eventHandlers['TestEvent']).to.have.length(2)
    })
  })

  describe('registerNotification', () => {
    it('stores notification metadata correctly', () => {
      const metadata = { class: class TestNotification {} } as unknown as NotificationMetadata

      registry.registerNotification('TestNotification', metadata)

      expect(registry.notifications['TestNotification']).to.equal(metadata)
    })

    it('throws on duplicate notification name', () => {
      const metadata = { class: class TestNotification {} } as unknown as NotificationMetadata

      registry.registerNotification('TestNotification', metadata)

      expect(() => registry.registerNotification('TestNotification', metadata)).to.throw(
        /A notification called TestNotification is already registered/
      )
    })
  })

  describe('registerScheduledCommand', () => {
    it('throws on duplicate scheduled command name', () => {
      const metadata = { name: 'DailyReport' } as unknown as ScheduledCommandMetadata

      registry.registerScheduledCommand('DailyReport', metadata)

      expect(() => registry.registerScheduledCommand('DailyReport', metadata)).to.throw(
        /A command called DailyReport is already registered/
      )
    })
  })

  describe('registerDataMigration', () => {
    it('throws on duplicate data migration name', () => {
      const metadata = { name: 'MigrateUsers' } as unknown as DataMigrationMetadata

      registry.registerDataMigration('MigrateUsers', metadata)

      expect(() => registry.registerDataMigration('MigrateUsers', metadata)).to.throw(
        /A data migration called MigrateUsers is already registered/
      )
    })
  })

  describe('registerSequenceKey', () => {
    it('stores sequence key correctly', () => {
      registry.registerSequenceKey('MyReadModel', 'sortKey')

      expect(registry.readModelSequenceKeys['MyReadModel']).to.equal('sortKey')
    })

    it('rejects conflicting sequence keys for the same class', () => {
      registry.registerSequenceKey('MyReadModel', 'sortKey')

      expect(() => registry.registerSequenceKey('MyReadModel', 'differentKey')).to.throw(
        /It already had the sort key `sortKey` defined/
      )
    })

    it('allows re-registering the same sequence key', () => {
      registry.registerSequenceKey('MyReadModel', 'sortKey')

      expect(() => registry.registerSequenceKey('MyReadModel', 'sortKey')).to.not.throw()
    })
  })

  describe('registerSchemaMigration', () => {
    it('stores schema migration correctly', () => {
      const metadata = { toVersion: 2 } as unknown as SchemaMigrationMetadata

      registry.registerSchemaMigration('TestConcept', 2, metadata)

      expect(registry.schemaMigrations['TestConcept']?.get(2)).to.equal(metadata)
    })

    it('throws on duplicate version for the same concept', () => {
      const metadata = { toVersion: 2 } as unknown as SchemaMigrationMetadata

      registry.registerSchemaMigration('TestConcept', 2, metadata)

      expect(() => registry.registerSchemaMigration('TestConcept', 2, metadata)).to.throw(
        /Found duplicated migration for 'TestConcept'/
      )
    })
  })

  describe('registerTopicMapping', () => {
    it('stores bidirectional topic mapping', () => {
      registry.registerTopicMapping('OrderCreated', 'orders-topic')

      expect(registry.eventToTopic['OrderCreated']).to.equal('orders-topic')
      expect(registry.topicToEvent['orders-topic']).to.equal('OrderCreated')
    })
  })

  describe('command() DSL method', () => {
    it('builds correct metadata with defaults', () => {
      const handler = async () => {}
      const result = registry.command('CreateProduct', {
        properties: [{ name: 'title', typeInfo: {} as any, dependencies: [] }],
      }, handler)

      expect(result.name).to.equal('CreateProduct')
      expect(result.handler).to.equal(handler)
      expect(result.before).to.deep.equal([])
      expect(result.methods).to.deep.equal([])
      expect(result.properties).to.have.length(1)
      expect(result.authorizer).to.be.a('function')
    })

    it('registers the command in commandHandlers', () => {
      registry.command('CreateProduct', {
        properties: [],
      }, async () => {})

      expect(registry.commandHandlers['CreateProduct']).to.exist
      expect(registry.commandHandlers['CreateProduct'].name).to.equal('CreateProduct')
    })

    it('resolves "all" authorize to an authorizer function', () => {
      const result = registry.command('CreateProduct', {
        authorize: 'all',
        properties: [],
      }, async () => {})

      expect(result.authorizer).to.be.a('function')
    })

    it('passes before hooks through', () => {
      const beforeFn = async (input: any) => input
      const result = registry.command('CreateProduct', {
        properties: [],
        before: [beforeFn],
      }, async () => {})

      expect(result.before).to.deep.equal([beforeFn])
    })

    it('throws on duplicate command name', () => {
      registry.command('CreateProduct', { properties: [] }, async () => {})

      expect(() => registry.command('CreateProduct', { properties: [] }, async () => {})).to.throw(
        /A command called CreateProduct is already registered/
      )
    })
  })

  describe('currentVersionFor', () => {
    it('returns 1 when no migrations are defined', () => {
      expect(registry.currentVersionFor('SomeConcept')).to.equal(1)
    })

    it('returns the max version from schema migrations', () => {
      const migrations = new Map<number, SchemaMigrationMetadata>()
      migrations.set(2, {} as any)
      migrations.set(3, {} as any)
      registry.schemaMigrations['TestConcept'] = migrations

      expect(registry.currentVersionFor('TestConcept')).to.equal(3)
    })
  })

  describe('validateSchemaMigrations', () => {
    it('throws when there are gaps in migration versions', () => {
      const migrations = new Map<number, SchemaMigrationMetadata>()
      migrations.set(2, {} as any)
      migrations.set(5, {} as any)
      registry.schemaMigrations['TestConcept'] = migrations

      expect(() => registry.validateSchemaMigrations()).to.throw(
        /Schema Migrations for 'TestConcept' are invalid/
      )
    })

    it('does not throw when migrations are consecutive', () => {
      const migrations = new Map<number, SchemaMigrationMetadata>()
      migrations.set(2, {} as any)
      migrations.set(3, {} as any)
      migrations.set(4, {} as any)
      registry.schemaMigrations['TestConcept'] = migrations

      expect(() => registry.validateSchemaMigrations()).to.not.throw()
    })
  })

  describe('hasRoles', () => {
    it('returns false when no roles are registered', () => {
      expect(registry.hasRoles()).to.be.false
    })

    it('returns true when roles are registered', () => {
      registry.roles['Admin'] = { auth: { signUpMethods: [] } }

      expect(registry.hasRoles()).to.be.true
    })
  })

  describe('describe()', () => {
    it('returns a serializable snapshot', () => {
      class ProductCreated {
        entityID(): UUID {
          return 'test-id'
        }
      }
      class Product {
        id: UUID = 'test-id'
      }

      registry.command('CreateProduct', {
        authorize: 'all',
        properties: [{ name: 'title', typeInfo: {} as any, dependencies: [] }],
        before: [async (input: any) => input],
        methods: [{ name: 'result', typeInfo: {} as any, dependencies: [] }],
      }, async () => {})

      registry.registerEvent('ProductCreated', { class: ProductCreated })
      registry.registerEntity('Product', {
        class: Product,
        eventStreamAuthorizer: async () => {},
      })
      registry.roles['Admin'] = { auth: { signUpMethods: [] } }

      const snapshot = registry.describe()

      expect(snapshot.commands).to.have.length(1)
      expect(snapshot.commands[0].name).to.equal('CreateProduct')
      expect(snapshot.commands[0].properties).to.deep.equal([{ name: 'title' }])
      expect(snapshot.commands[0].methods).to.deep.equal([{ name: 'result' }])
      expect(snapshot.commands[0].hasAuthorizer).to.be.true
      expect(snapshot.commands[0].beforeHooksCount).to.equal(1)

      expect(snapshot.events).to.have.length(1)
      expect(snapshot.events[0].name).to.equal('ProductCreated')

      expect(snapshot.entities).to.have.length(1)
      expect(snapshot.entities[0].name).to.equal('Product')

      expect(snapshot.roles).to.have.length(1)
      expect(snapshot.roles[0].name).to.equal('Admin')
    })

    it('roundtrips through JSON.stringify/JSON.parse', () => {
      class ProductCreated {
        entityID(): UUID {
          return 'test-id'
        }
      }

      registry.command('CreateProduct', {
        authorize: 'all',
        properties: [{ name: 'title', typeInfo: {} as any, dependencies: [] }],
      }, async () => {})

      registry.registerEvent('ProductCreated', { class: ProductCreated })

      const snapshot = registry.describe()
      const json = JSON.stringify(snapshot)
      const parsed = JSON.parse(json)

      expect(parsed.commands).to.have.length(1)
      expect(parsed.commands[0].name).to.equal('CreateProduct')
      expect(parsed.events).to.have.length(1)
      expect(parsed.events[0].name).to.equal('ProductCreated')
    })
  })
})
