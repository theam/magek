import { UserApp } from '@booster-ai/common'
import { HttpRequest } from '../library/request-types'

export class HealthService {
  public constructor(readonly userApp: UserApp) {}

  public async handleHealthRequest(request: HttpRequest): Promise<any> {
    return await this.userApp.boosterHealth(request)
  }
}
