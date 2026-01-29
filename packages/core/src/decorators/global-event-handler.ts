import { EventHandlerInterface } from '@magek/common'
import { registerEventHandler } from './event-handler'
import { Stage3ClassContext } from './stage3-utils'

export const GLOBAL_EVENT_HANDLERS = 'GLOBAL_EVENT_HANDLERS'

/**
 * Decorator to mark a class as a Global Event Handler.
 * Global event handlers react to all events in the system.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * @param eventHandlerClass - The event handler class
 */
export function GlobalEventHandler<TEventHandler extends EventHandlerInterface>(
  eventHandlerClass: TEventHandler,
  context: Stage3ClassContext
): void {
  registerEventHandler(GLOBAL_EVENT_HANDLERS, eventHandlerClass)
}
