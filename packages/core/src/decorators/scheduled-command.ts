import { Magek } from '../magek'
import { ScheduledCommandInterface, ScheduleInterface } from '@magek/common'
import { ClassDecoratorContext } from './decorator-types'

/**
 * Decorator to mark a class as a Magek Scheduled Command.
 * Scheduled commands are executed automatically based on a schedule.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * @param attributes - Schedule configuration (e.g., cron expression)
 * @returns A class decorator function
 */
export function ScheduledCommand(
  attributes: ScheduleInterface
): (scheduledCommandClass: ScheduledCommandInterface, context: ClassDecoratorContext) => void {
  return (commandClass) => {
    Magek.configureCurrentEnv((config): void => {
      if (config.scheduledCommandHandlers[commandClass.name]) {
        throw new Error(`A command called ${commandClass.name} is already registered.
        If you think that this is an error, try performing a clean build.`)
      }

      config.scheduledCommandHandlers[commandClass.name] = {
        class: commandClass,
        scheduledOn: attributes,
      }
    })
  }
}
