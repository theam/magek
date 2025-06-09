import { FastifyRequest, FastifyReply } from 'fastify'
import { HttpCodes, requestFailed } from '../http'
import { GraphQLService } from '@booster-ai/server'

export class GraphQLController {
  constructor(readonly graphQLService: GraphQLService) {}

  public async handleGraphQL(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Convert Fastify request to be compatible with existing GraphQL service
      const expressLikeRequest = {
        ...request,
        headers: request.headers,
        body: request.body,
        rawBody: (request as any).rawBody,
      }
      
      const response = await this.graphQLService.handleGraphQLRequest(expressLikeRequest as any)
      reply.status(HttpCodes.Ok).send(response.result)
    } catch (e) {
      await requestFailed(e as Error, reply)
      throw e
    }
  }
}
