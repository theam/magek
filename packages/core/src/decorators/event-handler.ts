import {
  EventInterface,
  EventHandlerInterface,
  Class,
  MagekConfig,
  NotificationInterface,
} from '@magek/common'
import { Magek } from '../magek'
import { ClassDecoratorContext } from './decorator-types'

/**
 * Decorator to mark a class as an Event Handler.
 * Event handlers react to specific events and perform side effects.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * @param event - The event class to handle
 * @returns A class decorator function
 */
export function EventHandler<TEvent extends EventInterface | NotificationInterface>(
  event: Class<TEvent>
): <TEventHandler extends EventHandlerInterface>(
  eventHandlerClass: TEventHandler,
  context: ClassDecoratorContext
) => void {
  // Note: `_context` is required for the Stage 3 decorator signature but is not used here.
  return (eventHandlerClass, _context?: Stage3ClassContext) => {
    registerEventHandler(event.name, eventHandlerClass)
  }
}

export function registerEventHandler<TEventHandler extends EventHandlerInterface>(
  eventName: string,
  eventHandlerClass: TEventHandler
): void {
  Magek.configureCurrentEnv((config: MagekConfig): void => {
    const registeredEventHandlers = config.eventHandlers[eventName] || []
    if (registeredEventHandlers.some((klass: EventHandlerInterface) => klass == eventHandlerClass)) {
      return
    }
    registeredEventHandlers.push(eventHandlerClass)
    config.eventHandlers[eventName] = registeredEventHandlers
  })
}
