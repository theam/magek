import {
  EventInterface,
  EventHandlerInterface,
  Class,
  MagekConfig,
  NotificationInterface,
} from '@magek/common'
import { Magek } from '../magek'

/**
 * Stage 3 class decorator context
 */
interface Stage3ClassContext {
  kind: 'class'
  name: string | undefined
  metadata: Record<string | symbol, unknown>
  addInitializer?: (initializer: () => void) => void
}

/**
 * Type guard to detect Stage 3 class decorator context
 */
function isStage3ClassContext(arg: unknown): arg is Stage3ClassContext {
  return (
    arg !== null &&
    typeof arg === 'object' &&
    'kind' in arg &&
    (arg as Stage3ClassContext).kind === 'class' &&
    'metadata' in arg
  )
}

/**
 * Decorator to mark a class as an Event Handler.
 * Event handlers react to specific events and perform side effects.
 *
 * Supports both legacy decorators (experimentalDecorators) and
 * Stage 3 TC39 decorators.
 *
 * @param event - The event class to handle
 * @returns A class decorator function
 */
export function EventHandler<TEvent extends EventInterface | NotificationInterface>(
  event: Class<TEvent>
): <TEventHandler extends EventHandlerInterface>(
  eventHandlerClass: TEventHandler,
  context?: Stage3ClassContext
) => void {
  return (eventHandlerClass, context?) => {
    // Stage 3 context is received but we don't need to do anything special with it
    // Just validate it if present
    if (context !== undefined && !isStage3ClassContext(context)) {
      // If a second argument is passed but it's not a valid Stage 3 context, ignore it
    }

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
