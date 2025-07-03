import { EventHandlerInterface } from '@booster-ai/common'
import { registerEventHandler } from './event-handler.js'

export const BOOSTER_GLOBAL_EVENT_HANDLERS = 'BOOSTER_GLOBAL_EVENT_HANDLERS'

export function GlobalEventHandler<TEventHandler extends EventHandlerInterface>(
  eventHandlerClass: TEventHandler
): void {
  registerEventHandler(BOOSTER_GLOBAL_EVENT_HANDLERS, eventHandlerClass)
}
