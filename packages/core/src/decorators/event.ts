import { Class, EventInterface } from '@magek/common'
import { Magek } from '../magek'
import { transferFieldMetadata, ClassDecoratorContext } from './decorator-utils'

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
  context: ClassDecoratorContext
): void {
  // Transfer Stage 3 field metadata
  transferFieldMetadata(eventClass, context.metadata)

  Magek.configureCurrentEnv((config): void => {
    if (config.events[eventClass.name]) {
      throw new Error(`A event called ${eventClass.name} is already registered.
        If you think that this is an error, try performing a clean build.`)
    }
    config.events[eventClass.name] = {
      class: eventClass,
    }
  })
}
