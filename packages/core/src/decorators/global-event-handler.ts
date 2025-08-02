import { EventHandlerInterface } from '@magek/common'
import { registerEventHandler } from './event-handler'

export const GLOBAL_EVENT_HANDLERS = 'GLOBAL_EVENT_HANDLERS'

export function GlobalEventHandler<TEventHandler extends EventHandlerInterface>(
  eventHandlerClass: TEventHandler
): void {
  registerEventHandler(GLOBAL_EVENT_HANDLERS, eventHandlerClass)
}
