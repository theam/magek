import { Magek } from '../magek'
import { ScheduledCommandInterface, ScheduleInterface } from '@magek/common'

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
 * Decorator to mark a class as a Magek Scheduled Command.
 * Scheduled commands are executed automatically based on a schedule.
 *
 * Supports both legacy decorators (experimentalDecorators) and
 * Stage 3 TC39 decorators.
 *
 * @param attributes - Schedule configuration (e.g., cron expression)
 * @returns A class decorator function
 */
export function ScheduledCommand(
  attributes: ScheduleInterface
): (scheduledCommandClass: ScheduledCommandInterface, context?: Stage3ClassContext) => void {
  return (commandClass, context?) => {
    // Stage 3 context is received but we don't need to do anything special with it
    // Just validate it if present
    if (context !== undefined && !isStage3ClassContext(context)) {
      // If a second argument is passed but it's not a valid Stage 3 context, ignore it
    }

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
