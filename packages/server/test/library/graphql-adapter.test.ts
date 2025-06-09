/* eslint-disable @typescript-eslint/no-explicit-any */
import { SinonStub, stub, replace, restore, fake } from 'sinon'
import { rawGraphQLRequestToEnvelope } from '../../src/library/graphql-adapter'
import { expect } from '../expect'
import { BoosterConfig, UUID } from '@booster-ai/common'
import { random } from 'faker'
import { HttpRequest } from '../../src/library/request-types'

describe('Local provider graphql-adapter', () => {
  describe('rawGraphQLRequestToEnvelope', () => {
    let mockUuid: string
    let mockBody: any
    let mockRequest: HttpRequest
    let mockUserToken: string
    const mockConfig = new BoosterConfig('test')
    mockConfig.logger = {
      debug: fake(),
      info: fake(),
      warn: fake(),
      error: fake(),
    }

    let generateStub: SinonStub

    beforeEach(() => {
      mockUuid = random.uuid()
      mockUserToken = random.uuid()
      mockBody = {
        query: '',
        variables: {},
      }
      mockRequest = {
        body: mockBody,
        headers: {
          authorization: mockUserToken,
        },
        params: {},
        query: {},
      }

      generateStub = stub().returns(mockUuid)

      replace(UUID, 'generate', generateStub)
    })

    afterEach(() => {
      restore()
    })

    it('should call logger.debug', async () => {
      await rawGraphQLRequestToEnvelope(mockConfig, mockRequest)

      expect(mockConfig.logger?.debug).to.have.been.calledOnceWith(
        '[Booster]|graphql-adapter#httpMessageToEnvelope: ',
        'Received GraphQL request: \n- Headers: ',
        mockRequest.headers,
        '\n- Body: ',
        mockRequest.body
      )
    })

    it('should generate expected envelop', async () => {
      const result = await rawGraphQLRequestToEnvelope(mockConfig, mockRequest)
      expect(result).to.be.deep.equal({
        requestID: mockUuid,
        eventType: 'MESSAGE',
        connectionID: undefined,
        token: mockUserToken,
        value: mockBody,
        context: {
          request: {
            headers: mockRequest.headers,
            body: mockRequest.body,
          },
          rawContext: mockRequest,
        },
      })
    })
  })
})
