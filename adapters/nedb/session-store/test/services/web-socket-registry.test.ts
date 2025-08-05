import { expect } from '../expect'
import { WebSocketRegistry } from '../../src/web-socket-registry'
import * as sinon from 'sinon'

describe('WebSocketRegistry', () => {
  let registry: WebSocketRegistry
  let testDbPath: string
  let mockDataStore: any
  let storedData: any[]

  beforeEach(async () => {
    testDbPath = '/tmp/test-registry.json'
    storedData = []
    
    // Create a mock DataStore that behaves like NeDB but stores data in memory
    mockDataStore = {
      loadDatabaseAsync: sinon.stub().resolves(),
      ensureIndexAsync: sinon.stub().resolves(),
      insertAsync: sinon.stub().callsFake((doc: any) => {
        const newDoc = { ...doc, _id: `id_${storedData.length}` }
        storedData.push(newDoc)
        return Promise.resolve(newDoc)
      }),
      findAsync: sinon.stub().callsFake((query: any, projections?: any) => {
        let filtered = storedData.filter(doc => {
          return Object.keys(query).every(key => doc[key] === query[key])
        })
        
        // Apply projections if specified
        if (projections && typeof projections === 'object') {
          filtered = filtered.map(doc => {
            const projected: any = {}
            for (const key in projections) {
              if (projections[key] === 1 && doc.hasOwnProperty(key)) {
                projected[key] = doc[key]
              }
            }
            return projected
          })
        }
        
        // Return an object that has a sort method and an execAsync method
        const cursor = {
          sort: (sortOptions: any) => ({
            limit: (n: number) => ({
              execAsync: () => Promise.resolve(filtered.slice(0, n))
            }),
            execAsync: () => Promise.resolve(filtered)
          }),
          limit: (n: number) => ({
            execAsync: () => Promise.resolve(filtered.slice(0, n))
          }),
          execAsync: () => Promise.resolve(filtered)
        }
        return cursor
      }),
      removeAsync: sinon.stub().callsFake((query: any, options: any) => {
        const initialLength = storedData.length
        if (Object.keys(query).length === 0) {
          // Remove all
          storedData.splice(0, storedData.length)
        } else {
          // Remove matching documents
          for (let i = storedData.length - 1; i >= 0; i--) {
            const doc = storedData[i]
            const matches = Object.keys(query).every(key => doc[key] === query[key])
            if (matches) {
              storedData.splice(i, 1)
            }
          }
        }
        return Promise.resolve(initialLength - storedData.length)
      }),
      countAsync: sinon.stub().callsFake((query: any) => {
        if (!query || Object.keys(query).length === 0) {
          return Promise.resolve(storedData.length)
        }
        const filtered = storedData.filter(doc => {
          return Object.keys(query).every(key => doc[key] === query[key])
        })
        return Promise.resolve(filtered.length)
      })
    }
    
    registry = new WebSocketRegistry(testDbPath)
    
    // Replace the internal datastore with our mock
    registry.datastore = mockDataStore
  })

  afterEach(() => {
    sinon.restore()
    storedData = []
  })

  describe('basic operations', () => {
    const testData = {
      connectionID: 'test-connection-123',
      userId: 'user-456',
      timestamp: new Date().toISOString()
    }

    it('should store and retrieve data', async () => {
      await registry.store(testData)
      
      const results = await registry.query({ connectionID: 'test-connection-123' })
      expect(results).to.be.an('array')
      expect(results).to.have.length(1)
      expect((results as any[])[0]).to.include(testData)
    })

    it('should delete data', async () => {
      await registry.store(testData)
      
      let results = await registry.query({ connectionID: 'test-connection-123' })
      expect(results).to.have.length(1)
      
      const deleted = await registry.delete({ connectionID: 'test-connection-123' })
      expect(deleted).to.equal(1)
      
      results = await registry.query({ connectionID: 'test-connection-123' })
      expect(results).to.have.length(0)
    })

    it('should count records', async () => {
      expect(await registry.count()).to.equal(0)
      
      await registry.store(testData)
      expect(await registry.count()).to.equal(1)
      
      await registry.store({ ...testData, connectionID: 'another-connection' })
      expect(await registry.count()).to.equal(2)
      
      expect(await registry.count({ connectionID: 'test-connection-123' })).to.equal(1)
    })

    it('should delete all records', async () => {
      await registry.store(testData)
      await registry.store({ ...testData, connectionID: 'another-connection' })
      
      expect(await registry.count()).to.equal(2)
      
      const deleted = await registry.deleteAll()
      expect(deleted).to.equal(2)
      expect(await registry.count()).to.equal(0)
    })
  })

  describe('query functionality', () => {
    const baseData = {
      userId: 'user-123',
      timestamp: new Date().toISOString()
    }

    beforeEach(async () => {
      // Clear any existing data before inserting test data
      await registry.deleteAll()
      
      // Insert test data with different creation times
      for (let i = 0; i < 5; i++) {
        await registry.store({
          ...baseData,
          connectionID: `connection-${i}`,
          createdAt: i
        })
      }
    })

    it('should support query with sorting', async () => {
      const results = await registry.query({}, 1) // ascending order
      expect(results).to.have.length(5)
      
      const sortedResults = results as any[]
      for (let i = 0; i < 4; i++) {
        expect(sortedResults[i].createdAt).to.be.at.most(sortedResults[i + 1].createdAt)
      }
    })

    it('should support query with limit', async () => {
      const results = await registry.query({}, 1, 3)
      expect(results).to.have.length(3)
    })

    it('should support query with projections', async () => {
      const results = await registry.query({}, 1, undefined, { connectionID: 1, userId: 1 })
      expect(results).to.have.length(5)
      
      const result = (results as any[])[0]
      expect(result).to.have.property('connectionID')
      expect(result).to.have.property('userId')
      expect(result).to.not.have.property('timestamp')
    })
  })

  describe('database lifecycle', () => {
    it('should load database only once', async () => {
      // Create a fresh registry for this test to check the load state
      const freshRegistry = new WebSocketRegistry('/tmp/fresh-test-registry.json')
      
      expect(freshRegistry.isLoaded).to.be.false
      
      await freshRegistry.loadDatabaseIfNeeded()
      expect(freshRegistry.isLoaded).to.be.true
      
      // Second call should not reload
      await freshRegistry.loadDatabaseIfNeeded()
      expect(freshRegistry.isLoaded).to.be.true
    })

    it('should handle multiple concurrent operations', async () => {
      const promises = []
      
      for (let i = 0; i < 10; i++) {
        promises.push(registry.store({
          connectionID: `connection-${i}`,
          userId: `user-${i}`,
          timestamp: new Date().toISOString()
        }))
      }
      
      await Promise.all(promises)
      
      const count = await registry.count()
      expect(count).to.equal(10)
    })
  })
})