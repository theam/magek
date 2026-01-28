import { Magek } from '../magek'
import { GlobalErrorHandlerInterface } from '@magek/common'

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
 * Decorator to mark a class as a Global Error Handler.
 * Global error handlers catch and handle errors from the entire system.
 *
 * Supports both legacy decorators (experimentalDecorators) and
 * Stage 3 TC39 decorators.
 *
 * @returns A class decorator function
 */
export function GlobalErrorHandler(): (
  errorHandlerClass: GlobalErrorHandlerInterface,
  context?: Stage3ClassContext
) => void {
  return (errorHandlerClass, context?) => {
    // Stage 3 context is received but we don't need to do anything special with it
    // Just validate it if present
    if (context !== undefined && !isStage3ClassContext(context)) {
      // If a second argument is passed but it's not a valid Stage 3 context, ignore it
    }

    Magek.configureCurrentEnv((config): void => {
      if (config.globalErrorsHandler) {
        throw new Error(`An error handler called ${errorHandlerClass.name} is already registered.
        If you think that this is an error, try performing a clean build.`)
      }

      config.globalErrorsHandler = { class: errorHandlerClass }
    })
  }
}
