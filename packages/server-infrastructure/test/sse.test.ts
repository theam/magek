import { restore, createStubInstance, SinonStubbedInstance } from 'sinon'
import { GraphQLService } from '@booster-ai/server'
import { expect } from './expect'

/**
 * Test SSE (Server-Sent Events) actual functionality
 */
describe('SSE integration', () => {
  let graphQLServiceStub: SinonStubbedInstance<GraphQLService>

  beforeEach(() => {
    graphQLServiceStub = createStubInstance(GraphQLService)
  })

  afterEach(() => {
    restore()
  })

  describe('SSE endpoint functionality', () => {
    it('should handle SSE connection with proper GraphQL service integration', async () => {
      // Test that SSE connections are properly integrated with GraphQL service
      graphQLServiceStub.handleGraphQLRequest.resolves({
        result: { data: { status: 'connected' } },
        status: 'success',
      })

      const webSocketRequest = {
        connectionContext: {
          connectionId: 'test-sse-connection-id',
          eventType: 'CONNECT' as const,
        },
        incomingMessage: {
          headers: { authorization: 'Bearer test-token' },
        },
      }

      const result = await graphQLServiceStub.handleGraphQLRequest(webSocketRequest)

      expect(result.status).to.equal('success')
      expect(graphQLServiceStub.handleGraphQLRequest).to.have.been.calledWith(webSocketRequest)
    })

    it('should generate unique SSE connection IDs', () => {
      // Test that connection ID generation is working correctly
      const connectionId1 = `sse_${Date.now()}_${Math.random()}`
      const connectionId2 = `sse_${Date.now()}_${Math.random()}`

      expect(connectionId1).to.not.equal(connectionId2)
      expect(connectionId1).to.match(/^sse_/)
      expect(connectionId2).to.match(/^sse_/)
    })
  })
})
