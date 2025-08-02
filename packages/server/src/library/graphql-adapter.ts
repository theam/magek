import {
  MagekConfig,
  EventType,
  GraphQLClientMessage,
  GraphQLOperation,
  GraphQLRequestEnvelope,
  GraphQLRequestEnvelopeError,
  UUID,
  getLogger,
} from '@magek/common'
import { FastifyRequest } from 'fastify'

export interface WebSocketMessage {
  connectionContext: {
    connectionId: string
    eventType: 'CONNECT' | 'MESSAGE' | 'DISCONNECT'
  }
  data?: any
  incomingMessage?: any
}

export async function rawGraphQLRequestToEnvelope(
  config: MagekConfig,
  request: FastifyRequest | WebSocketMessage
): Promise<GraphQLRequestEnvelope | GraphQLRequestEnvelopeError> {
  const requestID = UUID.generate()
  return isWebSocketMessage(request)
    ? webSocketMessageToEnvelope(config, request, requestID)
    : httpMessageToEnvelope(config, request, requestID)
}

function webSocketMessageToEnvelope(
  config: MagekConfig,
  webSocketRequest: WebSocketMessage,
  requestID: UUID
): GraphQLRequestEnvelope | GraphQLRequestEnvelopeError {
  const logger = getLogger(config, 'graphql-adapter#webSocketMessageToEnvelope')
  logger.debug('Received  WebSocket GraphQL request: ', webSocketRequest)

  let eventType: EventType = 'MESSAGE'
  const incomingMessage = webSocketRequest.incomingMessage
  const headers = incomingMessage?.headers
  const data = webSocketRequest.data as GraphQLOperation | GraphQLClientMessage | undefined
  try {
    const connectionContext = webSocketRequest.connectionContext
    eventType = connectionContext?.eventType
    return {
      requestID,
      eventType,
      connectionID: connectionContext?.connectionId.toString(),
      token: Array.isArray(headers?.authorization) ? headers.authorization[0] : headers?.authorization,
      value: data,
      context: {
        request: {
          headers: headers,
          body: data,
        },
        rawContext: webSocketRequest,
      },
    }
  } catch (e) {
    return {
      error: e,
      requestID,
      connectionID: undefined,
      eventType: eventType,
      context: {
        request: {
          headers: headers,
          body: data,
        },
        rawContext: webSocketRequest,
      },
    } as GraphQLRequestEnvelopeError
  }
}

function httpMessageToEnvelope(
  config: MagekConfig,
  httpRequest: FastifyRequest,
  requestId: UUID
): GraphQLRequestEnvelope | GraphQLRequestEnvelopeError {
  const logger = getLogger(config, 'graphql-adapter#httpMessageToEnvelope')
  const eventType: EventType = 'MESSAGE'
  const headers = httpRequest.headers
  const data = httpRequest.body as GraphQLOperation | GraphQLClientMessage | undefined
  try {
    logger.debug('Received GraphQL request: \n- Headers: ', headers, '\n- Body: ', data)
    return {
      connectionID: undefined,
      requestID: requestId,
      eventType: eventType,
      token: Array.isArray(headers?.authorization) ? headers.authorization[0] : headers?.authorization,
      value: data,
      context: {
        request: {
          headers: headers,
          body: data,
        },
        rawContext: httpRequest,
      },
    }
  } catch (e) {
    return {
      error: e,
      requestID: requestId,
      connectionID: undefined,
      eventType: eventType,
      context: {
        request: {
          headers: headers,
          body: data,
        },
        rawContext: httpRequest,
      },
    } as GraphQLRequestEnvelopeError
  }
}

function isWebSocketMessage(
  request: FastifyRequest | WebSocketMessage
): request is WebSocketMessage {
  return 'connectionContext' in request
}
