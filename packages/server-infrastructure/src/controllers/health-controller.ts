import { FastifyRequest, FastifyReply } from 'fastify'
import { HttpCodes, requestFailed } from '../http'
import { HealthService } from '@booster-ai/server'
import { HttpRequest } from '@booster-ai/server/dist/library/request-types'

export class HealthController {
  constructor(readonly healthService: HealthService) {}

  public async handleHealth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Convert Fastify request to generic HttpRequest interface
      const httpRequest: HttpRequest = {
        headers: request.headers as Record<string, string | string[] | undefined>,
        body: request.body,
        params: request.params as Record<string, string | undefined>,
        query: request.query as Record<string, any>,
      }
      
      const response = await this.healthService.handleHealthRequest(httpRequest)
      if (response.status === 'success') {
        reply.status(HttpCodes.Ok).send(response.result)
      } else {
        reply.status(response.code).send({
          title: response.title,
          reason: response.message,
        })
      }
    } catch (e) {
      await requestFailed(e as Error, reply)
      throw e
    }
  }
}
