import type { Logger } from '@magek/common'

const initializeEnvironmentImpl = (logger: Logger, environment?: string): boolean => {
  if (environment) {
    process.env.MAGEK_ENV = environment
  }

  if (!environmentService.currentEnvironment()) {
    logger.error(
      'Error: No environment set. Use the flag `-e` or set the environment variable MAGEK_ENV to set it before running this command. Example usage: `magek start -e <environment>`.'
    )
    return false
  }
  return true
}

const currentEnvironmentImpl = (): string | undefined => process.env.MAGEK_ENV

export const environmentService = {
  initializeEnvironment: initializeEnvironmentImpl,
  currentEnvironment: currentEnvironmentImpl,
}

export const initializeEnvironment = (...args: Parameters<typeof initializeEnvironmentImpl>) =>
  environmentService.initializeEnvironment(...args)

export const currentEnvironment = (...args: Parameters<typeof currentEnvironmentImpl>) =>
  environmentService.currentEnvironment(...args)
