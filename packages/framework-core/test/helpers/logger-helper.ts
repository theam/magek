import { Logger } from '@booster-ai/common'

/**
 * Logger that doesn't do anything
 */
export const noopLogger: Logger = {
  debug: () => {},
  warn: () => {},
  info: () => {},
  error: () => {},
}
