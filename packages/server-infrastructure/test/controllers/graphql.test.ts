import { restore, SinonStub, SinonStubbedInstance, createStubInstance, stub, replace } from 'sinon'
import { GraphQLService } from '@magek/server'
import { GraphQLController } from '../../src/controllers/graphql'
import { FastifyRequest, FastifyReply } from 'fastify'
import { expect } from '../expect'
import { faker } from '@faker-js/faker'

// Helper to create a mock FastifyRequest
function mockFastifyRequest(overrides: any = {}): FastifyRequest {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as FastifyRequest
}

// Helper to create a mock FastifyReply  
function mockFastifyReply(): FastifyReply {
  const reply = {
    status: stub().returnsThis(),
    send: stub().returnsThis(),
    sent: false,
  }
  return reply as unknown as FastifyReply
}

describe('GraphQL controller', () => {
  let mockQueryResponse: any

  let graphQLServiceStub: SinonStubbedInstance<GraphQLService>
  let queryStub: SinonStub

  let sut: GraphQLController
  beforeEach(() => {
    mockQueryResponse = {
      status: 'success',
      result: {
        data: {
          ChangeCartItem: true,
        },
      },
    }

    graphQLServiceStub = createStubInstance(GraphQLService)
    queryStub = stub().resolves(mockQueryResponse)

    replace(graphQLServiceStub, 'handleGraphQLRequest', queryStub as any)

    sut = new GraphQLController(graphQLServiceStub)
  })

  afterEach(() => {
    restore()
  })

  describe('handleGraphQL', () => {
    let mockRequest: FastifyRequest
    let mockReply: FastifyReply

    let sendStub: SinonStub
    let statusStub: SinonStub

    beforeEach(() => {
      mockRequest = mockFastifyRequest({})
      mockReply = mockFastifyReply()

      sendStub = mockReply.send as SinonStub
      statusStub = mockReply.status as SinonStub
    })

    it('should call GraphQLService.handleGraphQLRequest', async () => {
      await sut.handleGraphQL(mockRequest, mockReply)

      expect(queryStub).to.have.been.calledOnce
      // Check that the converted request has the right properties
      const calledWith = queryStub.getCall(0).args[0]
      expect(calledWith).to.have.property('headers')
      expect(calledWith).to.have.property('body')
    })

    context('on success', () => {
      beforeEach(async () => {
        await sut.handleGraphQL(mockRequest, mockReply)
      })

      it('should return expected status code', async () => {
        expect(statusStub).to.be.calledOnceWith(200)
      })

      it('should call reply.send with expected arguments', () => {
        expect(sendStub).to.be.calledOnceWith({ ...mockQueryResponse.result })
      })
    })

    context('on failure', () => {
      let error: Error

      beforeEach(async () => {
        error = new Error(faker.lorem.words())
        queryStub.rejects(error)

        try {
          await sut.handleGraphQL(mockRequest, mockReply)
        } catch (e) {
          // Expected to throw
        }
      })

      it('should return expected status code', async () => {
        expect(statusStub).to.be.calledOnceWith(500)
      })

      it('should call reply.send with expected arguments', () => {
        expect(sendStub).to.be.calledOnceWith({ title: 'Error', reason: error.message })
      })
    })
  })
})
