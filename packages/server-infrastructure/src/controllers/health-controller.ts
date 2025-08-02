import { FastifyRequest, FastifyReply } from 'fastify'
import { HttpCodes, requestFailed } from '../http'
import { HealthService } from '@magek/server'

export class HealthController {
  constructor(readonly healthService: HealthService) {}

  public async handleHealth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const response = await this.healthService.handleHealthRequest(request)
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
