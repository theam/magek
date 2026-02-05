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
  return (commandClass, _context?: ClassDecoratorContext) => {
    Magek.configureCurrentEnv((config): void => {
      config.registry.registerScheduledCommand(commandClass.name, {
        class: commandClass,
        scheduledOn: attributes,
      })
    })
  }
}
