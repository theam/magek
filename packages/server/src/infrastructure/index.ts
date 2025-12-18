import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import websocket from '@fastify/websocket'
import { FastifySSEPlugin } from 'fastify-sse-v2'
import cors from '@fastify/cors'
import * as http from 'node:http'
import * as path from 'path'
import * as process from 'process'
import { MagekConfig, ProviderInfrastructure, RocketDescriptor, RocketLoader, UserApp } from '@magek/common'
import { GraphQLService, HealthService } from '../services'
import { requestFailed } from './http'
import { GraphQLController } from './controllers/graphql'
import { configureScheduler } from './scheduler'
import { InfrastructureRocket } from './infrastructure-rocket'
import { HealthController } from './controllers/health-controller'
import { WebSocketRegistry } from './websocket-registry'

export * from './test-helper/local-test-helper'
export * from './infrastructure-rocket'
export * from './websocket-registry'

// Global WebSocket registry instance
let globalWebSocketRegistry: WebSocketRegistry | undefined

/**
 * Get the global WebSocket registry instance
 */
export function getWebSocketRegistry(): WebSocketRegistry {
  if (!globalWebSocketRegistry) {
    throw new Error('WebSocket registry not initialized. Make sure the Fastify server is started.')
  }
  return globalWebSocketRegistry
}

/**
 * Send a message to a WebSocket connection
 * This function is used by the server package to send messages through the Fastify WebSocket implementation
 */
export function sendWebSocketMessage(connectionId: string, data: unknown): void {
  const registry = getWebSocketRegistry()
  registry.sendMessage(connectionId, data)
}

/**
 * Build a Fastify server instance for testing purposes
 */
export async function buildFastifyServer(
  config: MagekConfig,
  graphQLService: GraphQLService,
  healthService: HealthService
): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false, // Disable logging for tests
    bodyLimit: 6 * 1024 * 1024, // 6MB
  })

  // Initialize WebSocket registry if not already done
  if (!globalWebSocketRegistry) {
    globalWebSocketRegistry = new WebSocketRegistry()
    // Set global registry for access from server package
    ;(global as any).webSocketRegistry = globalWebSocketRegistry
  }

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
      // Add rawBody to the request for compatibility
      ;(req as any).rawBody = rawBody
      const json = JSON.parse(rawBody.toString())
      done(null, json)
    } catch (err) {
      done(err as Error, undefined)
    }
  })

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

      // Add connection to registry
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

  await fastify.ready()
  return fastify
}

/**
 * Default error handling for Fastify. Handles errors in route handlers
 * and sends appropriate error responses.
 */
async function defaultErrorHandler(error: unknown, request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (reply.sent) {
    return
  }
  console.error(error)
  // Convert unknown error to Error for requestFailed
  const err = error instanceof Error ? error : new Error(String(error))
  await requestFailed(err, reply)
}

export const Infrastructure = (rocketDescriptors?: RocketDescriptor[]): ProviderInfrastructure => {
  const rockets = rocketDescriptors?.map(RocketLoader.loadRocket) as InfrastructureRocket[]
  return {
    /**
     * `start` serves as the entry point for the local provider. It starts the required infrastructure
     * locally, which is now running a `fastify` server with WebSocket and SSE support.
     *
     * @param config The user's project config
     * @param port Port on which the fastify server will listen
     */
    start: async (config: MagekConfig, port: number): Promise<void> => {
      let httpServer: http.Server

      // Initialize WebSocket registry
      globalWebSocketRegistry = new WebSocketRegistry()

      // Set global registry for access from server package
      ;(global as any).webSocketRegistry = globalWebSocketRegistry

      const fastify = Fastify({
        serverFactory(handler, opts) {
          httpServer = http.createServer(handler)
          return httpServer
        },
        logger: true,
        bodyLimit: 6 * 1024 * 1024, // 6MB
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
          // Add rawBody to the request for compatibility
          ;(req as any).rawBody = rawBody
          const json = JSON.parse(rawBody.toString())
          done(null, json)
        } catch (err) {
          done(err as Error, undefined)
        }
      })

      const userProject = require(path.join(process.cwd(), 'dist', 'index.js'))
      const graphQLService = new GraphQLService(userProject as UserApp)
      const healthService = new HealthService(userProject as UserApp)

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

          // Add connection to registry
          globalWebSocketRegistry!.addConnection(connectionId, connection.socket)

          connection.socket.on('message', async (message: Buffer) => {
            try {
              const data = JSON.parse(message.toString())
              // Create a WebSocketMessage for the GraphQL service
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

          // Handle connection init
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

          // Initialize SSE connection
          reply.sse({
            id: connectionId,
            event: 'connection',
            data: JSON.stringify({
              type: 'connection_init',
              payload: { connectionId },
            }),
          })

          // Handle SSE connection for read model updates
          const webSocketRequest = {
            connectionContext: {
              connectionId,
              eventType: 'CONNECT' as const,
            },
            incomingMessage: request.raw,
          }

          // Initialize GraphQL connection for read model subscriptions
          void graphQLService.handleGraphQLRequest(webSocketRequest)

          // Set up ping to keep connection alive
          const pingInterval = setInterval(() => {
            if (!reply.sent) {
              reply.sse({
                id: Date.now().toString(),
                event: 'ping',
                data: JSON.stringify({ type: 'ping', timestamp: Date.now() }),
              })
            }
          }, 30000) // Ping every 30 seconds

          // Clean up on connection close
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

      // Register rockets if any
      if (rockets && rockets.length > 0) {
        console.log('Warning: Rocket mounting is not yet fully supported with Fastify. Rockets will be skipped.')
        console.log(
          'Rockets to mount:',
          rockets.map((r) => r.constructor.name)
        )
        // TODO: Implement full rocket support for Fastify
        // For now, we skip rocket mounting to maintain compatibility
      }

      // Set error handler
      fastify.setErrorHandler(async (error, request, reply) => {
        await defaultErrorHandler(error, request, reply)
      })

      // Start the server
      await fastify.ready()
      httpServer!.listen(port, () => {
        configureScheduler(config, userProject)
      })
    },
  }
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
