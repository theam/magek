import { FastifyRequest, FastifyReply } from 'fastify'
import { HttpCodes, requestFailed } from '../http'
import { GraphQLService } from '@booster-ai/server'

export class GraphQLController {
  constructor(readonly graphQLService: GraphQLService) {}

  public async handleGraphQL(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const response = await this.graphQLService.handleGraphQLRequest(request)
      reply.status(HttpCodes.Ok).send(response.result)
    } catch (e) {
      await requestFailed(e as Error, reply)
      throw e
    }
  }
}
