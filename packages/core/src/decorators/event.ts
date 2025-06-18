import { Class, EventInterface } from '@booster-ai/common'
import { Booster } from '../booster'

/**
 * Annotation to tell Booster which classes are your Events
 * @param eventClass
 * @constructor
 */
// Disabling unused vars here, because it won't allow us to call the decorator without parens
 
export function Event<TEvent extends EventInterface>(eventClass: Class<TEvent>): void {
  Booster.configureCurrentEnv((config): void => {
    if (config.events[eventClass.name]) {
      throw new Error(`A event called ${eventClass.name} is already registered.
        If you think that this is an error, try performing a clean build.`)
    }
    config.events[eventClass.name] = {
      class: eventClass,
    }
  })
}
