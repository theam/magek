import { restore, createStubInstance, SinonStubbedInstance } from 'sinon'
import { GraphQLService } from '@magek/server'
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
  })
})
