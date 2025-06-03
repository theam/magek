import * as express from 'express'
import { UserApp } from '@booster-ai/common'

export class HealthService {
  public constructor(readonly userApp: UserApp) {}

  public async handleHealthRequest(request: express.Request): Promise<any> {
    return await this.userApp.boosterHealth(request)
  }
}
