import { ReadModelEnvelope, UserApp } from '@booster-ai/common'
import { HttpRequest, WebSocketMessage } from '../library/request-types'

export class GraphQLService {
  public constructor(readonly userApp: UserApp) {}

  public async handleGraphQLRequest(request: HttpRequest | WebSocketMessage): Promise<any> {
    return await this.userApp.boosterServeGraphQL(request)
  }

  public async handleNotificationSubscription(request: Array<ReadModelEnvelope>): Promise<unknown> {
    return await this.userApp.boosterNotifySubscribers(request)
  }
}
