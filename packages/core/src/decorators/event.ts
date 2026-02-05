import { Class, EventInterface } from '@magek/common'
import { Magek } from '../magek'
import { ClassDecoratorContext } from './decorator-utils'

/**
 * Decorator to mark a class as a Magek Event.
 * Events are immutable records of facts that occurred in your system.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * @param eventClass - The event class to register
 */
export function Event<TEvent extends EventInterface>(
  eventClass: Class<TEvent>,
  _context: ClassDecoratorContext
): void {
  Magek.configureCurrentEnv((config): void => {
    config.registry.registerEvent(eventClass.name, { class: eventClass })
  })
}
