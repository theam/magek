import { FastifyRequest, FastifyReply } from 'fastify'
import { HttpCodes, requestFailed } from '../http'
import { GraphQLService } from '@booster-ai/server'
import { HttpRequest } from '@booster-ai/server/dist/library/request-types'

export class GraphQLController {
  constructor(readonly graphQLService: GraphQLService) {}

  public async handleGraphQL(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Convert Fastify request to generic HttpRequest interface
      const httpRequest: HttpRequest = {
        headers: request.headers as Record<string, string | string[] | undefined>,
        body: request.body,
        params: request.params as Record<string, string | undefined>,
        query: request.query as Record<string, any>,
        rawBody: (request as any).rawBody,
      }
      
      const response = await this.graphQLService.handleGraphQLRequest(httpRequest)
      reply.status(HttpCodes.Ok).send(response.result)
    } catch (e) {
      await requestFailed(e as Error, reply)
      throw e
    }
  }
}
