import { expect } from './expect'
import { MemorySessionStoreAdapter } from '../src/memory-session-store-adapter'
import { MagekConfig } from '@magek/common'
import { faker } from '@faker-js/faker'
import { fake, restore } from 'sinon'

describe('MemorySessionStoreAdapter', () => {
  let adapter: MemorySessionStoreAdapter
  let mockConfig: MagekConfig

  beforeEach(() => {
    adapter = new MemorySessionStoreAdapter()
    mockConfig = new MagekConfig('test')
    mockConfig.appName = 'test-app'
    mockConfig.logger = {
      info: fake(),
      warn: fake(),
      error: fake(),
      debug: fake(),
    }
  })

  afterEach(() => {
    restore()
    adapter.clear()
  })

  describe('connections', () => {
    describe('storeConnection', () => {
      it('should store a connection', async () => {
        const connectionId = faker.string.uuid()
        const connectionData = { user: 'testUser', token: 'testToken' }

        await adapter.storeConnection(mockConfig, connectionId, connectionData)

        expect(adapter.getConnectionsCount()).to.equal(1)
      })
    })

    describe('fetchConnection', () => {
      it('should fetch a stored connection', async () => {
        const connectionId = faker.string.uuid()
        const connectionData = { user: 'testUser', token: 'testToken' }

        await adapter.storeConnection(mockConfig, connectionId, connectionData)
        const result = await adapter.fetchConnection(mockConfig, connectionId)

        expect(result).to.deep.equal(connectionData)
      })

      it('should return undefined for non-existent connection', async () => {
        const result = await adapter.fetchConnection(mockConfig, faker.string.uuid())

        expect(result).to.be.undefined
      })
    })

    describe('deleteConnection', () => {
      it('should delete a stored connection', async () => {
        const connectionId = faker.string.uuid()
        const connectionData = { user: 'testUser' }

        await adapter.storeConnection(mockConfig, connectionId, connectionData)
        await adapter.deleteConnection(mockConfig, connectionId)

        expect(adapter.getConnectionsCount()).to.equal(0)
      })

      it('should handle deleting non-existent connection gracefully', async () => {
        await adapter.deleteConnection(mockConfig, faker.string.uuid())

        expect(adapter.getConnectionsCount()).to.equal(0)
      })
    })
  })

  describe('subscriptions', () => {
    describe('storeSubscription', () => {
      it('should store a subscription', async () => {
        const connectionId = faker.string.uuid()
        const subscriptionId = faker.string.uuid()
        const subscriptionData = { className: 'TestReadModel', filter: {} }

        await adapter.storeSubscription(mockConfig, connectionId, subscriptionId, subscriptionData)

        expect(adapter.getSubscriptionsCount()).to.equal(1)
      })
    })

    describe('fetchSubscription', () => {
      it('should fetch a stored subscription', async () => {
        const connectionId = faker.string.uuid()
        const subscriptionId = faker.string.uuid()
        const subscriptionData = { className: 'TestReadModel', filter: { name: 'test' } }

        await adapter.storeSubscription(mockConfig, connectionId, subscriptionId, subscriptionData)
        const result = await adapter.fetchSubscription(mockConfig, subscriptionId)

        expect(result).to.deep.equal(subscriptionData)
      })

      it('should return undefined for non-existent subscription', async () => {
        const result = await adapter.fetchSubscription(mockConfig, faker.string.uuid())

        expect(result).to.be.undefined
      })
    })

    describe('deleteSubscription', () => {
      it('should delete a stored subscription', async () => {
        const connectionId = faker.string.uuid()
        const subscriptionId = faker.string.uuid()
        const subscriptionData = { className: 'TestReadModel' }

        await adapter.storeSubscription(mockConfig, connectionId, subscriptionId, subscriptionData)
        await adapter.deleteSubscription(mockConfig, connectionId, subscriptionId)

        expect(adapter.getSubscriptionsCount()).to.equal(0)
      })

      it('should handle deleting non-existent subscription gracefully', async () => {
        await adapter.deleteSubscription(mockConfig, faker.string.uuid(), faker.string.uuid())

        expect(adapter.getSubscriptionsCount()).to.equal(0)
      })
    })

    describe('fetchSubscriptionsForConnection', () => {
      it('should fetch all subscriptions for a connection', async () => {
        const connectionId = faker.string.uuid()

        await adapter.storeSubscription(mockConfig, connectionId, faker.string.uuid(), {
          className: 'Model1',
        })
        await adapter.storeSubscription(mockConfig, connectionId, faker.string.uuid(), {
          className: 'Model2',
        })
        await adapter.storeSubscription(mockConfig, faker.string.uuid(), faker.string.uuid(), {
          className: 'Model3',
        })

        const results = await adapter.fetchSubscriptionsForConnection(mockConfig, connectionId)

        expect(results).to.have.length(2)
      })

      it('should return empty array for connection with no subscriptions', async () => {
        const results = await adapter.fetchSubscriptionsForConnection(mockConfig, faker.string.uuid())

        expect(results).to.be.an('array').that.is.empty
      })
    })

    describe('fetchSubscriptionsByClassName', () => {
      it('should fetch all subscriptions for a class name', async () => {
        const className = 'TestReadModel'

        await adapter.storeSubscription(mockConfig, faker.string.uuid(), faker.string.uuid(), {
          className,
        })
        await adapter.storeSubscription(mockConfig, faker.string.uuid(), faker.string.uuid(), {
          className,
        })
        await adapter.storeSubscription(mockConfig, faker.string.uuid(), faker.string.uuid(), {
          className: 'OtherModel',
        })

        const results = await adapter.fetchSubscriptionsByClassName(mockConfig, className)

        expect(results).to.have.length(2)
        results.forEach((result) => {
          expect(result.className).to.equal(className)
        })
      })

      it('should return empty array for class name with no subscriptions', async () => {
        const results = await adapter.fetchSubscriptionsByClassName(mockConfig, 'NonExistent')

        expect(results).to.be.an('array').that.is.empty
      })
    })

    describe('deleteSubscriptionsForConnection', () => {
      it('should delete all subscriptions for a connection', async () => {
        const connectionId = faker.string.uuid()

        await adapter.storeSubscription(mockConfig, connectionId, faker.string.uuid(), {
          className: 'Model1',
        })
        await adapter.storeSubscription(mockConfig, connectionId, faker.string.uuid(), {
          className: 'Model2',
        })

        await adapter.deleteSubscriptionsForConnection(mockConfig, connectionId)

        expect(adapter.getSubscriptionsCount()).to.equal(0)
      })

      it('should not affect other connections subscriptions', async () => {
        const connectionId1 = faker.string.uuid()
        const connectionId2 = faker.string.uuid()

        await adapter.storeSubscription(mockConfig, connectionId1, faker.string.uuid(), {
          className: 'Model1',
        })
        await adapter.storeSubscription(mockConfig, connectionId2, faker.string.uuid(), {
          className: 'Model2',
        })

        await adapter.deleteSubscriptionsForConnection(mockConfig, connectionId1)

        expect(adapter.getSubscriptionsCount()).to.equal(1)
      })
    })
  })

  describe('healthCheck', () => {
    describe('isUp', () => {
      it('should return true', async () => {
        const result = await adapter.healthCheck.isUp(mockConfig)

        expect(result).to.be.true
      })
    })

    describe('details', () => {
      it('should return status and counts', async () => {
        await adapter.storeConnection(mockConfig, faker.string.uuid(), {})
        await adapter.storeSubscription(mockConfig, faker.string.uuid(), faker.string.uuid(), {})

        const result = (await adapter.healthCheck.details(mockConfig)) as any

        expect(result.type).to.equal('memory')
        expect(result.status).to.equal('healthy')
        expect(result.connections.count).to.equal(1)
        expect(result.subscriptions.count).to.equal(1)
      })
    })

    describe('urls', () => {
      it('should return memory URL', async () => {
        const result = await adapter.healthCheck.urls(mockConfig)

        expect(result).to.deep.equal(['memory://in-memory-session-store'])
      })
    })
  })
})
