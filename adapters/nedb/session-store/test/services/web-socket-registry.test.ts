import { expect } from '../expect'
import { WebSocketRegistry } from '../../src/web-socket-registry'
import * as sinon from 'sinon'
import * as fs from 'fs'

describe('WebSocketRegistry', () => {
  let registry: WebSocketRegistry
  let testDbPath: string

  beforeEach(() => {
    // Set up virtual file path
    testDbPath = '/tmp/test-registry.json'
    
    // Stub filesystem operations to avoid actual file I/O
    sinon.stub(fs, 'existsSync').returns(false)
    sinon.stub(fs, 'mkdirSync')
    sinon.stub(fs, 'writeFileSync')
    sinon.stub(fs, 'readFileSync').returns('{}')
    sinon.stub(fs, 'unlinkSync')
    sinon.stub(fs, 'rmSync')
    
    registry = new WebSocketRegistry(testDbPath)
  })

  afterEach(() => {
    // Restore all stubs
    sinon.restore()
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
      expect(registry.isLoaded).to.be.false
      
      await registry.loadDatabaseIfNeeded()
      expect(registry.isLoaded).to.be.true
      
      // Second call should not reload
      await registry.loadDatabaseIfNeeded()
      expect(registry.isLoaded).to.be.true
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