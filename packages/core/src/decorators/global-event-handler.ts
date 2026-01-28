import { EventHandlerInterface } from '@magek/common'
import { registerEventHandler } from './event-handler'

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

export const GLOBAL_EVENT_HANDLERS = 'GLOBAL_EVENT_HANDLERS'

/**
 * Decorator to mark a class as a Global Event Handler.
 * Global event handlers react to all events in the system.
 *
 * Supports both legacy decorators (experimentalDecorators) and
 * Stage 3 TC39 decorators.
 *
 * @param eventHandlerClass - The event handler class
 */
export function GlobalEventHandler<TEventHandler extends EventHandlerInterface>(
  eventHandlerClass: TEventHandler,
  context?: Stage3ClassContext
): void {
  // Stage 3 context is received but we don't need to do anything special with it
  // Just validate it if present
  if (context !== undefined && !isStage3ClassContext(context)) {
    // If a second argument is passed but it's not a valid Stage 3 context, ignore it
  }

  registerEventHandler(GLOBAL_EVENT_HANDLERS, eventHandlerClass)
}
