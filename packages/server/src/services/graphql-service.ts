import { ReadModelEnvelope, UserApp } from '@booster-ai/common'
import { FastifyRequest } from 'fastify'
import { WebSocketMessage } from '../library/graphql-adapter.js'

export class GraphQLService {
  public constructor(readonly userApp: UserApp) {}

  public async handleGraphQLRequest(request: FastifyRequest | WebSocketMessage): Promise<any> {
    return await this.userApp.boosterServeGraphQL(request)
  }

  public async handleNotificationSubscription(request: Array<ReadModelEnvelope>): Promise<unknown> {
    return await this.userApp.boosterNotifySubscribers(request)
  }
}
