import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import { FastifySSEPlugin } from 'fastify-sse-v2'
import cors from '@fastify/cors'
import * as http from 'node:http'
import { GraphQLService, HealthService } from '@booster-ai/server'
import { BoosterConfig, ProviderInfrastructure, RocketDescriptor, UserApp, RocketLoader } from '@booster-ai/common'
import * as path from 'path'
import { requestFailed } from './http'
import { GraphQLController } from './controllers/graphql'
import { configureScheduler } from './scheduler'
import { InfrastructureRocket } from './infrastructure-rocket'
import { HealthController } from './controllers/health-controller'
import * as process from 'process'
import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'

export * from './test-helper/local-test-helper'
export * from './infrastructure-rocket'

/**
 * Default error handling for Fastify. Handles errors in route handlers
 * and sends appropriate error responses.
 */
async function defaultErrorHandler(error: Error, request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (reply.sent) {
    return
  }
  console.error(error)
  await requestFailed(error, reply)
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
    start: async (config: BoosterConfig, port: number): Promise<void> => {
      let httpServer: http.Server

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

          connection.socket.on('message', async (message) => {
            try {
              const data = JSON.parse(message.toString())
              // Create a mock ExpressWebSocketMessage for compatibility with existing GraphQL service
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

      // Register rockets if any
      if (rockets && rockets.length > 0) {
        console.log('Warning: Rocket mounting is not yet fully supported with Fastify. Rockets will be skipped.')
        console.log('Rockets to mount:', rockets.map(r => r.constructor.name))
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
