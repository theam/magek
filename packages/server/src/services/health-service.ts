import { UserApp } from '@magek/common'
import { FastifyRequest } from 'fastify'

export class HealthService {
  public constructor(readonly userApp: UserApp) {}

  public async handleHealthRequest(request: FastifyRequest): Promise<any> {
    return await this.userApp.health(request)
  }
}
