import { Magek } from '../magek'
import { GlobalErrorHandlerInterface } from '@magek/common'
import { Stage3ClassContext } from './stage3-utils'

/**
 * Decorator to mark a class as a Global Error Handler.
 * Global error handlers catch and handle errors from the entire system.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * @returns A class decorator function
 */
export function GlobalErrorHandler(): (
  errorHandlerClass: GlobalErrorHandlerInterface,
  context: Stage3ClassContext
) => void {
  return (errorHandlerClass) => {
    Magek.configureCurrentEnv((config): void => {
      if (config.globalErrorsHandler) {
        throw new Error(`An error handler called ${errorHandlerClass.name} is already registered.
        If you think that this is an error, try performing a clean build.`)
      }

      config.globalErrorsHandler = { class: errorHandlerClass }
    })
  }
}
