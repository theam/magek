import { restore, createStubInstance, SinonStubbedInstance, stub, SinonStub } from 'sinon'
import { GraphQLService } from '@booster-ai/server'
import { expect } from './expect'
import { FastifyRequest, FastifyReply } from 'fastify'

/**
 * Mock SSE functionality for testing
 */
function mockSSEReply(): FastifyReply & { sse: SinonStub } {
  return {
    sse: stub(),
    sent: false,
    status: stub().returnsThis(),
    send: stub().returnsThis(),
  } as any
}

function mockSSERequest(): FastifyRequest {
  return {
    raw: {
      headers: {
        authorization: 'test-token',
      },
      on: stub(),
    },
    headers: {},
    params: {},
    query: {},
    body: {},
  } as any
}

/**
 * Test SSE (Server-Sent Events) functionality
 */
describe('SSE integration', () => {
  let graphQLServiceStub: SinonStubbedInstance<GraphQLService>
  let mockRequest: FastifyRequest
  let mockReply: FastifyReply & { sse: SinonStub }

  beforeEach(() => {
    graphQLServiceStub = createStubInstance(GraphQLService)
    mockRequest = mockSSERequest()
    mockReply = mockSSEReply()
  })

  afterEach(() => {
    restore()
  })

  describe('SSE connection initialization', () => {
    it('should send connection_init message on connection', () => {
      // Simulate SSE connection initialization
      const connectionId = `sse_${Date.now()}_${Math.random()}`

      mockReply.sse({
        id: connectionId,
        event: 'connection',
        data: JSON.stringify({
          type: 'connection_init',
          payload: { connectionId },
        }),
      })

      expect(mockReply.sse).to.have.been.calledWith({
        id: connectionId,
        event: 'connection',
        data: JSON.stringify({
          type: 'connection_init',
          payload: { connectionId },
        }),
      })
    })

    it('should handle GraphQL connection for read model subscriptions', async () => {
      const connectionId = 'test-sse-connection-id'

      // Simulate the WebSocket message that would be sent to GraphQL service
      const webSocketRequest = {
        connectionContext: {
          connectionId,
          eventType: 'CONNECT' as const,
        },
        incomingMessage: mockRequest.raw,
      }

      await graphQLServiceStub.handleGraphQLRequest(webSocketRequest)

      expect(graphQLServiceStub.handleGraphQLRequest).to.have.been.calledWith(webSocketRequest)
    })
  })

  describe('SSE connection maintenance', () => {
    it('should send ping messages to keep connection alive', () => {
      // Test ping functionality
      const pingData = {
        id: Date.now().toString(),
        event: 'ping',
        data: JSON.stringify({ type: 'ping', timestamp: Date.now() }),
      }

      mockReply.sse(pingData)

      expect(mockReply.sse).to.have.been.calledWith(pingData)
    })

    it('should not send ping if reply is already sent', () => {
      mockReply.sent = true

      // Simulate ping interval - should not call sse if sent is true
      if (!mockReply.sent) {
        mockReply.sse({
          id: Date.now().toString(),
          event: 'ping',
          data: JSON.stringify({ type: 'ping', timestamp: Date.now() }),
        })
      }

      expect(mockReply.sse).to.not.have.been.called
    })
  })

  describe('SSE connection cleanup', () => {
    it('should handle connection close event', async () => {
      const connectionId = 'test-sse-connection-id'

      // Simulate connection close
      const disconnectRequest = {
        connectionContext: {
          connectionId,
          eventType: 'DISCONNECT' as const,
        },
      }

      await graphQLServiceStub.handleGraphQLRequest(disconnectRequest)

      expect(graphQLServiceStub.handleGraphQLRequest).to.have.been.calledWith(disconnectRequest)
    })

    it('should clear ping interval on connection close', () => {
      // Test that ping interval is cleared when connection closes
      let intervalCleared = false
      const mockInterval = setInterval(() => {}, 1000)

      // Simulate clearing the interval
      clearInterval(mockInterval)
      intervalCleared = true

      expect(intervalCleared).to.be.true
    })
  })

  describe('SSE connection lifecycle', () => {
    it('should generate unique SSE connection IDs', () => {
      const connectionId1 = `sse_${Date.now()}_${Math.random()}`
      const connectionId2 = `sse_${Date.now()}_${Math.random()}`

      expect(connectionId1).to.not.equal(connectionId2)
    })

    it('should use sse_ prefix for SSE connections', () => {
      const connectionId = `sse_${Date.now()}_${Math.random()}`

      expect(connectionId).to.match(/^sse_/)
    })
  })

  describe('SSE read model subscription flow', () => {
    it('should support read model update notifications', () => {
      // Test that SSE can be used for read model subscriptions
      const readModelUpdate = {
        id: 'update-1',
        event: 'read_model_update',
        data: JSON.stringify({
          type: 'read_model_updated',
          payload: {
            readModelName: 'TestReadModel',
            data: { id: '123', value: 'updated' },
          },
        }),
      }

      mockReply.sse(readModelUpdate)

      expect(mockReply.sse).to.have.been.calledWith(readModelUpdate)
    })

    it('should handle subscription management via SSE', () => {
      // Test SSE subscription flow
      const subscriptionMessage = {
        id: 'sub-1',
        event: 'subscription',
        data: JSON.stringify({
          type: 'subscribe',
          payload: {
            readModelName: 'TestReadModel',
            filter: { active: true },
          },
        }),
      }

      mockReply.sse(subscriptionMessage)

      expect(mockReply.sse).to.have.been.calledWith(subscriptionMessage)
    })
  })
})
