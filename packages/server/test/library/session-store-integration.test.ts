import { expect } from '../expect'
import { sessionStore } from '@magek/adapter-session-store-nedb'
import { MagekConfig } from '@magek/common'
import * as sinon from 'sinon'

describe('session store integration', () => {
  let config: MagekConfig

  beforeEach(() => {
    config = new MagekConfig('test')
    // Configure the session store adapter
    config.sessionStoreAdapter = sessionStore
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should configure session store adapter successfully', () => {
    expect(config.sessionStoreAdapter).to.not.be.undefined
    expect(config.sessionStoreAdapter).to.have.property('storeConnection')
    expect(config.sessionStoreAdapter).to.have.property('fetchConnection')
    expect(config.sessionStoreAdapter).to.have.property('deleteConnection')
    expect(config.sessionStoreAdapter).to.have.property('storeSubscription')
    expect(config.sessionStoreAdapter).to.have.property('fetchSubscription')
    expect(config.sessionStoreAdapter).to.have.property('deleteSubscription')
  })

  it('should use the session store adapter for connection operations', async () => {
    const connectionId = 'test-connection-456'
    const connectionData = {
      userId: 'user-789',
      sessionId: 'session-012',
      metadata: { userAgent: 'test-agent' }
    }

    // Store connection data
    await config.sessionStoreAdapter!.storeConnection(config, connectionId, connectionData)

    // Fetch connection data
    const retrieved = await config.sessionStoreAdapter!.fetchConnection(config, connectionId)
    expect(retrieved).to.deep.equal(connectionData)

    // Delete connection data
    await config.sessionStoreAdapter!.deleteConnection(config, connectionId)

    // Verify deletion
    const afterDelete = await config.sessionStoreAdapter!.fetchConnection(config, connectionId)
    expect(afterDelete).to.be.undefined
  })

  it('should use the session store adapter for subscription operations', async () => {
    const connectionId = 'test-connection-789'
    const subscriptionId = 'test-subscription-012'
    const subscriptionData = {
      query: 'subscription { notifications }',
      variables: { userId: 'user-123' },
      operationName: 'NotificationSubscription'
    }

    // Store subscription data
    await config.sessionStoreAdapter!.storeSubscription(config, connectionId, subscriptionId, subscriptionData)

    // Fetch subscription data
    const retrieved = await config.sessionStoreAdapter!.fetchSubscription(config, subscriptionId)
    expect(retrieved).to.deep.equal(subscriptionData)

    // Fetch subscriptions for connection
    const forConnection = await config.sessionStoreAdapter!.fetchSubscriptionsForConnection(config, connectionId)
    expect(forConnection).to.have.length(1)
    expect(forConnection[0]).to.deep.equal(subscriptionData)

    // Delete subscription
    await config.sessionStoreAdapter!.deleteSubscription(config, subscriptionId)

    // Verify deletion
    const afterDelete = await config.sessionStoreAdapter!.fetchSubscription(config, subscriptionId)
    expect(afterDelete).to.be.undefined
  })

  it('should support health checks', async () => {
    const healthCheck = config.sessionStoreAdapter!.healthCheck

    expect(healthCheck).to.not.be.undefined
    expect(healthCheck).to.have.property('isUp')
    expect(healthCheck).to.have.property('details')
    expect(healthCheck).to.have.property('urls')

    const isUp = await healthCheck!.isUp(config)
    expect(isUp).to.be.true

    const details = await healthCheck!.details(config)
    expect(details).to.have.property('status', 'healthy')

    const urls = await healthCheck!.urls(config)
    expect(urls).to.be.an('array')
    expect(urls).to.have.length(2)
  })
})