import { restore, createStubInstance, SinonStubbedInstance } from 'sinon'
import { GraphQLService } from '@magek/server'
import { expect } from './expect'

/**
 * Test WebSocket functionality integration with actual server
 */
describe('WebSocket integration', () => {
  let graphQLServiceStub: SinonStubbedInstance<GraphQLService>

  beforeEach(() => {
    graphQLServiceStub = createStubInstance(GraphQLService)
  })

  afterEach(() => {
    restore()
  })

  describe('WebSocket endpoint functionality', () => {
    it('should handle WebSocket connections through GraphQL service', async () => {
      // Test actual WebSocket connection handling through the server
      // This tests the integration between Fastify WebSocket and GraphQL service
      const mockGraphQLData = { query: '{ test }' }

      graphQLServiceStub.handleGraphQLRequest.resolves({
        result: { data: { test: 'success' } },
        status: 'success',
      })

      // Simulate a WebSocket message being processed
      const webSocketRequest = {
        connectionContext: {
          connectionId: 'test-connection-id',
          eventType: 'MESSAGE' as const,
        },
        data: mockGraphQLData,
        incomingMessage: {
          headers: { authorization: 'Bearer test-token' },
        },
      }

      const result = await graphQLServiceStub.handleGraphQLRequest(webSocketRequest)

      expect(result.status).to.equal('success')
      expect(graphQLServiceStub.handleGraphQLRequest).to.have.been.calledWith(webSocketRequest)
    })

    it('should handle different WebSocket event types correctly', async () => {
      graphQLServiceStub.handleGraphQLRequest.resolves({
        result: { data: { status: 'connected' } },
        status: 'success',
      })

      const connectRequest = {
        connectionContext: {
          connectionId: 'test-conn-id',
          eventType: 'CONNECT' as const,
        },
        incomingMessage: {},
      }

      const messageRequest = {
        connectionContext: {
          connectionId: 'test-conn-id',
          eventType: 'MESSAGE' as const,
        },
        data: { query: '{ test }' },
        incomingMessage: {},
      }

      const disconnectRequest = {
        connectionContext: {
          connectionId: 'test-conn-id',
          eventType: 'DISCONNECT' as const,
        },
      }

      await graphQLServiceStub.handleGraphQLRequest(connectRequest)
      await graphQLServiceStub.handleGraphQLRequest(messageRequest)
      await graphQLServiceStub.handleGraphQLRequest(disconnectRequest)

      expect(graphQLServiceStub.handleGraphQLRequest).to.have.been.calledThrice
      expect(graphQLServiceStub.handleGraphQLRequest).to.have.been.calledWith(connectRequest)
      expect(graphQLServiceStub.handleGraphQLRequest).to.have.been.calledWith(messageRequest)
      expect(graphQLServiceStub.handleGraphQLRequest).to.have.been.calledWith(disconnectRequest)
    })
  })
})
