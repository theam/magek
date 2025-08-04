import { expect } from '../expect'
import { NedbSessionStoreAdapter } from '../../src/nedb-session-store-adapter'
import { MagekConfig } from '@magek/common'
import * as sinon from 'sinon'

describe('NedbSessionStoreAdapter', () => {
  let adapter: NedbSessionStoreAdapter
  let config: MagekConfig
  let connectionStoreMock: any
  let subscriptionStoreMock: any

  beforeEach(async () => {
    config = new MagekConfig('test')
    
    // Create in-memory storage for mock data
    const connectionData: Record<string, any>[] = []
    const subscriptionData: Record<string, any>[] = []
    
    // Create mock WebSocketRegistry instances
    connectionStoreMock = {
      store: sinon.stub().callsFake((doc: any) => {
        connectionData.push({ ...doc, _id: `conn_${connectionData.length}` })
        return Promise.resolve()
      }),
      query: sinon.stub().callsFake((query: any) => {
        const filtered = connectionData.filter(doc => {
          return Object.keys(query).every(key => doc[key] === query[key])
        })
        return Promise.resolve(filtered)
      }),
      delete: sinon.stub().callsFake((query: any) => {
        const initialLength = connectionData.length
        for (let i = connectionData.length - 1; i >= 0; i--) {
          const doc = connectionData[i]
          const matches = Object.keys(query).every(key => doc[key] === query[key])
          if (matches) {
            connectionData.splice(i, 1)
          }
        }
        return Promise.resolve(initialLength - connectionData.length)
      }),
      count: sinon.stub().callsFake(() => Promise.resolve(connectionData.length))
    }
    
    subscriptionStoreMock = {
      store: sinon.stub().callsFake((doc: any) => {
        subscriptionData.push({ ...doc, _id: `sub_${subscriptionData.length}` })
        return Promise.resolve()
      }),
      query: sinon.stub().callsFake((query: any) => {
        const filtered = subscriptionData.filter(doc => {
          return Object.keys(query).every(key => doc[key] === query[key])
        })
        return Promise.resolve(filtered)
      }),
      delete: sinon.stub().callsFake((query: any) => {
        const initialLength = subscriptionData.length
        for (let i = subscriptionData.length - 1; i >= 0; i--) {
          const doc = subscriptionData[i]
          const matches = Object.keys(query).every(key => doc[key] === query[key])
          if (matches) {
            subscriptionData.splice(i, 1)
          }
        }
        return Promise.resolve(initialLength - subscriptionData.length)
      }),
      count: sinon.stub().callsFake(() => Promise.resolve(subscriptionData.length))
    }
    
    adapter = new NedbSessionStoreAdapter()
    
    // Replace the internal registries with our mocks
    adapter['connectionRegistry'] = connectionStoreMock
    adapter['subscriptionRegistry'] = subscriptionStoreMock
  })

  afterEach(() => {
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