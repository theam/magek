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
    
    // Create simple mock WebSocketRegistry instances that just track method calls
    connectionStoreMock = {
      store: sinon.stub().resolves(),
      query: sinon.stub().resolves([]),
      delete: sinon.stub().resolves(0),
      count: sinon.stub().resolves(0)
    }
    
    subscriptionStoreMock = {
      store: sinon.stub().resolves(),
      query: sinon.stub().resolves([]),
      delete: sinon.stub().resolves(0),
      count: sinon.stub().resolves(0)
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
      
      expect(connectionStoreMock.store).to.have.been.calledOnce
      expect(connectionStoreMock.store).to.have.been.calledWith({
        ...connectionData,
        connectionID: connectionId,
      })
    })

    it('should fetch connection data when it exists', async () => {
      // Mock the query to return connection data
      connectionStoreMock.query.resolves([{ connectionID: connectionId, ...connectionData }])
      
      const retrieved = await adapter.fetchConnection(config, connectionId)
      
      expect(connectionStoreMock.query).to.have.been.calledOnce
      expect(connectionStoreMock.query).to.have.been.calledWith({ connectionID: connectionId })
      expect(retrieved).to.deep.equal(connectionData)
    })

    it('should return undefined for non-existent connection', async () => {
      // Mock the query to return empty array
      connectionStoreMock.query.resolves([])
      
      const retrieved = await adapter.fetchConnection(config, 'non-existent')
      
      expect(connectionStoreMock.query).to.have.been.calledOnce
      expect(connectionStoreMock.query).to.have.been.calledWith({ connectionID: 'non-existent' })
      expect(retrieved).to.be.undefined
    })

    it('should delete connection data', async () => {
      connectionStoreMock.delete.resolves(1)
      
      await adapter.deleteConnection(config, connectionId)
      
      expect(connectionStoreMock.delete).to.have.been.calledOnce
      expect(connectionStoreMock.delete).to.have.been.calledWith({ connectionID: connectionId })
    })

    it('should handle deleting non-existent connection gracefully', async () => {
      connectionStoreMock.delete.resolves(0)
      
      // Should not throw an error
      await adapter.deleteConnection(config, 'non-existent')
      
      expect(connectionStoreMock.delete).to.have.been.calledOnce
      expect(connectionStoreMock.delete).to.have.been.calledWith({ connectionID: 'non-existent' })
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
      
      expect(subscriptionStoreMock.store).to.have.been.calledOnce
      expect(subscriptionStoreMock.store).to.have.been.calledWith({
        ...subscriptionData,
        connectionID: connectionId,
        subscriptionID: subscriptionId,
      })
    })

    it('should fetch subscription data when it exists', async () => {
      // Mock the query to return subscription data
      subscriptionStoreMock.query.resolves([{ subscriptionID: subscriptionId, connectionID: connectionId, ...subscriptionData }])
      
      const retrieved = await adapter.fetchSubscription(config, subscriptionId)
      
      expect(subscriptionStoreMock.query).to.have.been.calledOnce
      expect(subscriptionStoreMock.query).to.have.been.calledWith({ subscriptionID: subscriptionId })
      expect(retrieved).to.deep.equal(subscriptionData)
    })

    it('should return undefined for non-existent subscription', async () => {
      // Mock the query to return empty array
      subscriptionStoreMock.query.resolves([])
      
      const retrieved = await adapter.fetchSubscription(config, 'non-existent')
      
      expect(subscriptionStoreMock.query).to.have.been.calledOnce
      expect(subscriptionStoreMock.query).to.have.been.calledWith({ subscriptionID: 'non-existent' })
      expect(retrieved).to.be.undefined
    })

    it('should delete subscription data', async () => {
      subscriptionStoreMock.delete.resolves(1)
      
      await adapter.deleteSubscription(config, subscriptionId)
      
      expect(subscriptionStoreMock.delete).to.have.been.calledOnce
      expect(subscriptionStoreMock.delete).to.have.been.calledWith({ subscriptionID: subscriptionId })
    })

    it('should fetch subscriptions for a connection', async () => {
      const subscription1Data = { ...subscriptionData, operationName: 'Sub1' }
      const subscription2Data = { ...subscriptionData, operationName: 'Sub2' }
      
      // Mock the query to return subscription data for the connection
      subscriptionStoreMock.query.resolves([
        { subscriptionID: 'sub-1', connectionID: connectionId, ...subscription1Data },
        { subscriptionID: 'sub-2', connectionID: connectionId, ...subscription2Data }
      ])
      
      const subscriptions = await adapter.fetchSubscriptionsForConnection(config, connectionId)
      
      expect(subscriptionStoreMock.query).to.have.been.calledOnce
      expect(subscriptionStoreMock.query).to.have.been.calledWith({ connectionID: connectionId })
      expect(subscriptions).to.have.length(2)
      expect(subscriptions).to.deep.include.members([subscription1Data, subscription2Data])
    })

    it('should delete all subscriptions for a connection', async () => {
      subscriptionStoreMock.delete.resolves(2)
      
      await adapter.deleteSubscriptionsForConnection(config, connectionId)
      
      expect(subscriptionStoreMock.delete).to.have.been.calledOnce
      expect(subscriptionStoreMock.delete).to.have.been.calledWith({ connectionID: connectionId })
    })

    it('should not affect subscriptions from other connections', async () => {
      // This is more of an integration concern, but we can test that our method
      // calls the delete with the correct connectionID filter
      subscriptionStoreMock.delete.resolves(1)
      
      await adapter.deleteSubscriptionsForConnection(config, connectionId)
      
      expect(subscriptionStoreMock.delete).to.have.been.calledOnce
      expect(subscriptionStoreMock.delete).to.have.been.calledWith({ connectionID: connectionId })
      // The fact that it only deletes for the specific connectionID ensures other connections aren't affected
    })
  })

  describe('health check', () => {
    it('should report as healthy', async () => {
      connectionStoreMock.count.resolves(5)
      subscriptionStoreMock.count.resolves(10)
      
      const isUp = await adapter.healthCheck.isUp(config)
      
      expect(isUp).to.be.true
      expect(connectionStoreMock.count).to.have.been.calledOnce
      expect(subscriptionStoreMock.count).to.have.been.calledOnce
    })

    it('should provide health details', async () => {
      connectionStoreMock.count.resolves(5)
      subscriptionStoreMock.count.resolves(10)
      
      const details = await adapter.healthCheck.details(config)
      
      expect(details).to.have.property('status', 'healthy')
      expect(details).to.have.property('connections')
      expect(details).to.have.property('subscriptions')
      expect((details as any).connections).to.have.property('count', 5)
      expect((details as any).subscriptions).to.have.property('count', 10)
      expect(connectionStoreMock.count).to.have.been.calledOnce
      expect(subscriptionStoreMock.count).to.have.been.calledOnce
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