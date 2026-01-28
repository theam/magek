import { Class, EventInterface } from '@magek/common'
import { Magek } from '../magek'
import { transferStage3FieldMetadata, isStage3ClassContext, Stage3ClassContext } from './stage3-utils'

/**
 * Decorator to mark a class as a Magek Event.
 * Events are immutable records of facts that occurred in your system.
 *
 * Supports both legacy decorators (experimentalDecorators) and
 * Stage 3 TC39 decorators.
 *
 * @param eventClass - The event class to register
 */
// Disabling unused vars here, because it won't allow us to call the decorator without parens
 
export function Event<TEvent extends EventInterface>(
  eventClass: Class<TEvent>,
  context?: Stage3ClassContext
): void {
  // Transfer Stage 3 field metadata if applicable
  if (isStage3ClassContext(context)) {
    transferStage3FieldMetadata(eventClass, context.metadata)
  }

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
