import { Logger } from '@magek/common'

/**
 * Logger that doesn't do anything
 */
export const noopLogger: Logger = {
  debug: () => {},
  warn: () => {},
  info: () => {},
  error: () => {},
}
