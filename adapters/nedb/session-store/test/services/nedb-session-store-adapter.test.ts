import { expect } from '../expect'
import { NedbSessionStoreAdapter } from '../../src/nedb-session-store-adapter'
import { MagekConfig } from '@magek/common'
import * as sinon from 'sinon'
import * as fs from 'fs'

describe('NedbSessionStoreAdapter', () => {
  let adapter: NedbSessionStoreAdapter
  let config: MagekConfig
  let mockConnectionsDb: string
  let mockSubscriptionsDb: string

  beforeEach(async () => {
    // Set up virtual file paths
    mockConnectionsDb = '/tmp/test-connections.json'
    mockSubscriptionsDb = '/tmp/test-subscriptions.json'
    
    // Stub filesystem operations to avoid actual file I/O
    sinon.stub(fs, 'existsSync').returns(false)
    sinon.stub(fs, 'mkdirSync')
    sinon.stub(fs, 'writeFileSync')
    sinon.stub(fs, 'readFileSync').returns('{}')
    sinon.stub(fs, 'unlinkSync')
    sinon.stub(fs, 'rmSync')
    
    // Mock the path functions to return our test paths
    const pathsModule = require('../../src/paths')
    sinon.stub(pathsModule, 'connectionsDatabase').returns(mockConnectionsDb)
    sinon.stub(pathsModule, 'subscriptionsDatabase').returns(mockSubscriptionsDb)
    
    adapter = new NedbSessionStoreAdapter()
    config = new MagekConfig('test')
    
    // Clear any existing data in the databases to ensure test isolation
    await adapter['connectionRegistry'].deleteAll()
    await adapter['subscriptionRegistry'].deleteAll()
  })

  afterEach(() => {
    // Restore all stubs
    sinon.restore()
  })

  describe('connection management', () => {
    const connectionId = 'test-connection-123'
    const connectionData = {
      userId: 'user-456',
      sessionId: 'session-789',
      metadata: { browser: 'Chrome' }
    }

    it('should store connection data', async () => {
      await adapter.storeConnection(config, connectionId, connectionData)
      
      const retrieved = await adapter.fetchConnection(config, connectionId)
      expect(retrieved).to.deep.equal(connectionData)
    })

    it('should return undefined for non-existent connection', async () => {
      const retrieved = await adapter.fetchConnection(config, 'non-existent')
      expect(retrieved).to.be.undefined
    })

    it('should delete connection data', async () => {
      await adapter.storeConnection(config, connectionId, connectionData)
      
      let retrieved = await adapter.fetchConnection(config, connectionId)
      expect(retrieved).to.deep.equal(connectionData)
      
      await adapter.deleteConnection(config, connectionId)
      
      retrieved = await adapter.fetchConnection(config, connectionId)
      expect(retrieved).to.be.undefined
    })

    it('should handle deleting non-existent connection gracefully', async () => {
      // Should not throw an error
      await adapter.deleteConnection(config, 'non-existent')
    })
  })

  describe('subscription management', () => {
    const connectionId = 'test-connection-123'
    const subscriptionId = 'test-subscription-456'
    const subscriptionData = {
      query: 'subscription { messages }',
      variables: { channel: 'general' },
      operationName: 'MessageSubscription'
    }

    it('should store subscription data', async () => {
      await adapter.storeSubscription(config, connectionId, subscriptionId, subscriptionData)
      
      const retrieved = await adapter.fetchSubscription(config, subscriptionId)
      expect(retrieved).to.deep.equal(subscriptionData)
    })

    it('should return undefined for non-existent subscription', async () => {
      const retrieved = await adapter.fetchSubscription(config, 'non-existent')
      expect(retrieved).to.be.undefined
    })

    it('should delete subscription data', async () => {
      await adapter.storeSubscription(config, connectionId, subscriptionId, subscriptionData)
      
      let retrieved = await adapter.fetchSubscription(config, subscriptionId)
      expect(retrieved).to.deep.equal(subscriptionData)
      
      await adapter.deleteSubscription(config, subscriptionId)
      
      retrieved = await adapter.fetchSubscription(config, subscriptionId)
      expect(retrieved).to.be.undefined
    })

    it('should fetch subscriptions for a connection', async () => {
      const subscription1Id = 'sub-1'
      const subscription2Id = 'sub-2'
      const subscription1Data = { ...subscriptionData, operationName: 'Sub1' }
      const subscription2Data = { ...subscriptionData, operationName: 'Sub2' }
      
      await adapter.storeSubscription(config, connectionId, subscription1Id, subscription1Data)
      await adapter.storeSubscription(config, connectionId, subscription2Id, subscription2Data)
      
      const subscriptions = await adapter.fetchSubscriptionsForConnection(config, connectionId)
      expect(subscriptions).to.have.length(2)
      expect(subscriptions).to.deep.include.members([subscription1Data, subscription2Data])
    })

    it('should delete all subscriptions for a connection', async () => {
      const subscription1Id = 'sub-1'
      const subscription2Id = 'sub-2'
      
      await adapter.storeSubscription(config, connectionId, subscription1Id, subscriptionData)
      await adapter.storeSubscription(config, connectionId, subscription2Id, subscriptionData)
      
      let subscriptions = await adapter.fetchSubscriptionsForConnection(config, connectionId)
      expect(subscriptions).to.have.length(2)
      
      await adapter.deleteSubscriptionsForConnection(config, connectionId)
      
      subscriptions = await adapter.fetchSubscriptionsForConnection(config, connectionId)
      expect(subscriptions).to.have.length(0)
    })

    it('should not affect subscriptions from other connections', async () => {
      const otherConnectionId = 'other-connection'
      const subscription1Id = 'sub-1'
      const subscription2Id = 'sub-2'
      
      await adapter.storeSubscription(config, connectionId, subscription1Id, subscriptionData)
      await adapter.storeSubscription(config, otherConnectionId, subscription2Id, subscriptionData)
      
      await adapter.deleteSubscriptionsForConnection(config, connectionId)
      
      const remainingSubscriptions = await adapter.fetchSubscriptionsForConnection(config, otherConnectionId)
      expect(remainingSubscriptions).to.have.length(1)
    })
  })

  describe('health check', () => {
    it('should report as healthy', async () => {
      const isUp = await adapter.healthCheck.isUp(config)
      expect(isUp).to.be.true
    })

    it('should provide health details', async () => {
      const details = await adapter.healthCheck.details(config)
      expect(details).to.have.property('status', 'healthy')
      expect(details).to.have.property('connections')
      expect(details).to.have.property('subscriptions')
    })

    it('should provide database URLs', async () => {
      const urls = await adapter.healthCheck.urls(config)
      expect(urls).to.be.an('array')
      expect(urls).to.have.length(2)
      urls.forEach(url => {
        expect(url).to.match(/^file:\/\/.*\.json$/)
      })
    })
  })
})