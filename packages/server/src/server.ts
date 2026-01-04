import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import websocket from '@fastify/websocket'
import { FastifySSEPlugin } from 'fastify-sse-v2'
import cors from '@fastify/cors'
import { UserApp } from '@magek/common'
import { GraphQLService, HealthService } from './services'
import { GraphQLController } from './infrastructure/controllers/graphql'
import { HealthController } from './infrastructure/controllers/health-controller'
import { WebSocketRegistry } from './infrastructure/websocket-registry'
import { requestFailed } from './infrastructure/http'
import { configureScheduler } from './infrastructure/scheduler'

// Global WebSocket registry instance
let globalWebSocketRegistry: WebSocketRegistry | undefined

/**
 * Get the global WebSocket registry instance
 */
export function getWebSocketRegistry(): WebSocketRegistry {
  if (!globalWebSocketRegistry) {
    throw new Error('WebSocket registry not initialized. Make sure the server is started.')
  }
  return globalWebSocketRegistry
}

/**
 * Send a message to a WebSocket connection
 */
export function sendWebSocketMessage(connectionId: string, data: unknown): void {
  const registry = getWebSocketRegistry()
  registry.sendMessage(connectionId, data)
}

export interface ServerOptions {
  /** Enable Fastify logging. Default: true */
  logger?: boolean
  /** Maximum request body size in bytes. Default: 6MB */
  bodyLimit?: number
}

/**
 * Default error handling for Fastify requests.
 */
async function defaultErrorHandler(error: unknown, request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (reply.sent) {
    return
  }
  console.error(error)
  const err = error instanceof Error ? error : new Error(String(error))
  await requestFailed(err, reply)
}

/**
 * Creates a configured Fastify server instance for a Magek application.
 *
 * @param userApp - The user's Magek application module
 * @param options - Optional server configuration
 * @returns A configured Fastify instance ready to listen
 *
 * @example
 * ```typescript
 * import { createServer } from '@magek/server'
 * import * as myApp from './dist'
 *
 * const server = await createServer(myApp)
 * await server.listen({ port: 3000 })
 * ```
 */
export async function createServer(userApp: UserApp, options: ServerOptions = {}): Promise<FastifyInstance> {
  const { logger = true, bodyLimit = 6 * 1024 * 1024 } = options

  // Initialize WebSocket registry
  globalWebSocketRegistry = new WebSocketRegistry()
  ;(global as any).webSocketRegistry = globalWebSocketRegistry

  const fastify = Fastify({
    logger,
    bodyLimit,
  })

  // Register plugins
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  })
  await fastify.register(websocket)
  await fastify.register(FastifySSEPlugin)

  // Add raw body support for GraphQL requests
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      const rawBody = body as Buffer
      ;(req as any).rawBody = rawBody
      const json = JSON.parse(rawBody.toString())
      done(null, json)
    } catch (err) {
      done(err as Error, undefined)
    }
  })

  const graphQLService = new GraphQLService(userApp)
  const healthService = new HealthService(userApp)

  // Register GraphQL endpoint
  const graphQLController = new GraphQLController(graphQLService)
  await fastify.register((instance: FastifyInstance) => {
    instance.post('/graphql', graphQLController.handleGraphQL.bind(graphQLController))
  })

  // Register Health endpoint
  const healthController = new HealthController(healthService)
  await fastify.register((instance: FastifyInstance) => {
    instance.get('/sensor/health/*', healthController.handleHealth.bind(healthController))
  })

  // Register WebSocket endpoint
  await fastify.register((instance: FastifyInstance) => {
    instance.get('/websocket', { websocket: true }, (connection, req) => {
      const connectionId = (req as any).connectionId || `conn_${Date.now()}_${Math.random()}`

      globalWebSocketRegistry!.addConnection(connectionId, connection.socket)

      connection.socket.on('message', async (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString())
          const webSocketRequest = {
            connectionContext: {
              connectionId,
              eventType: 'MESSAGE' as const,
            },
            data,
            incomingMessage: req.raw,
          }
          await graphQLService.handleGraphQLRequest(webSocketRequest)
        } catch (error) {
          console.error('WebSocket message error:', error)
          connection.socket.send(
            JSON.stringify({
              type: 'error',
              payload: { message: 'Failed to process message' },
            })
          )
        }
      })

      connection.socket.on('close', async () => {
        const webSocketRequest = {
          connectionContext: {
            connectionId,
            eventType: 'DISCONNECT' as const,
          },
        }
        await graphQLService.handleGraphQLRequest(webSocketRequest)
      })

      const webSocketRequest = {
        connectionContext: {
          connectionId,
          eventType: 'CONNECT' as const,
        },
        incomingMessage: req.raw,
      }
      void graphQLService.handleGraphQLRequest(webSocketRequest)
    })
  })

  // Register SSE endpoint
  await fastify.register((instance: FastifyInstance) => {
    instance.get('/sse', (request, reply) => {
      const connectionId = `sse_${Date.now()}_${Math.random()}`

      reply.sse({
        id: connectionId,
        event: 'connection',
        data: JSON.stringify({
          type: 'connection_init',
          payload: { connectionId },
        }),
      })

      const webSocketRequest = {
        connectionContext: {
          connectionId,
          eventType: 'CONNECT' as const,
        },
        incomingMessage: request.raw,
      }
      void graphQLService.handleGraphQLRequest(webSocketRequest)

      const pingInterval = setInterval(() => {
        if (!reply.sent) {
          reply.sse({
            id: Date.now().toString(),
            event: 'ping',
            data: JSON.stringify({ type: 'ping', timestamp: Date.now() }),
          })
        }
      }, 30000)

      request.raw.on('close', async () => {
        clearInterval(pingInterval)
        const disconnectRequest = {
          connectionContext: {
            connectionId,
            eventType: 'DISCONNECT' as const,
          },
        }
        await graphQLService.handleGraphQLRequest(disconnectRequest)
      })
    })
  })

  fastify.setErrorHandler(async (error, request, reply) => {
    await defaultErrorHandler(error, request, reply)
  })

  // Configure scheduled commands
  const config = userApp.Magek.config
  if (config) {
    configureScheduler(config, userApp)
  }

  await fastify.ready()
  return fastify
}

declare module 'http' {
  export interface IncomingMessage {
    rawBody: Buffer
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    rawBody: Buffer
  }
}
