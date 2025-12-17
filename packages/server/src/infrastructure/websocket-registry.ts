import type { WebSocket } from '@fastify/websocket'

/**
 * Registry to manage active WebSocket connections
 */
export class WebSocketRegistry {
  private connections: Map<string, WebSocket> = new Map()

  /**
   * Add a connection to the registry
   */
  addConnection(connectionId: string, socket: WebSocket): void {
    this.connections.set(connectionId, socket)

    // Clean up when connection closes
    socket.on('close', () => {
      this.connections.delete(connectionId)
    })
  }

  /**
   * Remove a connection from the registry
   */
  removeConnection(connectionId: string): void {
    this.connections.delete(connectionId)
  }

  /**
   * Send a message to a specific connection
   */
  sendMessage(connectionId: string, data: unknown): void {
    const connection = this.connections.get(connectionId)
    if (connection && connection.readyState === connection.OPEN) {
      connection.send(JSON.stringify(data))
    }
  }

  /**
   * Check if a connection exists
   */
  hasConnection(connectionId: string): boolean {
    return this.connections.has(connectionId)
  }

  /**
   * Get the number of active connections
   */
  getConnectionCount(): number {
    return this.connections.size
  }
}
