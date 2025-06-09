/**
 * Generic HTTP request interface that abstracts away the underlying server implementation.
 * This allows the server package to work with different HTTP server implementations
 * (Express, Fastify, etc.) without direct dependencies.
 */
export interface HttpRequest {
  headers: Record<string, string | string[] | undefined>
  body: any
  params?: Record<string, string | undefined>
  query?: Record<string, any>
  rawBody?: Buffer
}

/**
 * Generic HTTP response interface that abstracts away the underlying server implementation.
 */
export interface HttpResponse {
  status(code: number): HttpResponse
  send(data: any): HttpResponse
  json?(data: any): HttpResponse
}

/**
 * WebSocket message interface for handling WebSocket communications
 */
export interface WebSocketMessage {
  connectionContext: {
    connectionId: string
    eventType: 'CONNECT' | 'MESSAGE' | 'DISCONNECT'
  }
  data?: any
  incomingMessage?: any
}