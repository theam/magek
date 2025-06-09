import { FastifyRequest, FastifyReply } from 'fastify'
import { HttpCodes, requestFailed } from '../http'
import { HealthService } from '@booster-ai/server'

export class HealthController {
  constructor(readonly healthService: HealthService) {}

  public async handleHealth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // Convert Fastify request to be compatible with existing Health service
      const expressLikeRequest = {
        ...request,
        headers: request.headers,
        params: request.params,
        query: request.query,
      }
      
      const response = await this.healthService.handleHealthRequest(expressLikeRequest as any)
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
