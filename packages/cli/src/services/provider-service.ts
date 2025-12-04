import type { MagekConfig } from '@magek/common'

export function assertNameIsCorrect(name: string): void {
  // Current characters max length: 37
  // Lambda name limit is 64 characters
  // `-subscriptions-notifier` lambda is 23 characters
  // `-app` prefix is added to application stack
  // which is 64 - 23 - 4 = 37
  const maxProjectNameLength = 37

  if (name.length > maxProjectNameLength)
    throw new ForbiddenProjectName(name, `be longer than ${maxProjectNameLength} characters`)

  if (name.includes(' ')) throw new ForbiddenProjectName(name, 'contain spaces')

  if (name.toLowerCase() !== name) throw new ForbiddenProjectName(name, 'contain uppercase letters')

  if (name.includes('_')) throw new ForbiddenProjectName(name, 'contain underscore')
}

class ForbiddenProjectName extends Error {
  public readonly name: string
  public readonly restrictionText: string

  constructor(name: string, restrictionText: string) {
    super(`Project name cannot ${restrictionText}:\n\n    Found: '${name}'`)
    this.name = name
    this.restrictionText = restrictionText
  }
}

 
type ProviderOperation = (config: MagekConfig, ...args: Array<unknown>) => Promise<void>

function supportedInfrastructureMethodOrDie(
  methodName: 'deploy' | 'nuke' | 'start' | 'synth',
  config: MagekConfig
): ProviderOperation {
  assertNameIsCorrect(config.appName)
  const method = config.provider.infrastructure()[methodName] as ProviderOperation | undefined
  if (!method) {
    throw new Error(
      `Attempted to perform the '${methodName}' operation with a provider that does not support this feature, please check your environment configuration.`
    )
  }
  return method
}

const deployToCloudProviderImpl = (config: MagekConfig): Promise<void> =>
  supportedInfrastructureMethodOrDie('deploy', config)(config)

const synthToProviderImpl = (config: MagekConfig): Promise<void> =>
  supportedInfrastructureMethodOrDie('synth', config)(config)

const nukeCloudProviderResourcesImpl = (config: MagekConfig): Promise<void> =>
  supportedInfrastructureMethodOrDie('nuke', config)(config)

const startProviderImpl = (port: number, config: MagekConfig): Promise<void> =>
  supportedInfrastructureMethodOrDie('start', config)(config, port)

export const providerService = {
  deployToCloudProvider: deployToCloudProviderImpl,
  synthToProvider: synthToProviderImpl,
  nukeCloudProviderResources: nukeCloudProviderResourcesImpl,
  startProvider: startProviderImpl,
}

export const deployToCloudProvider = (...args: Parameters<typeof deployToCloudProviderImpl>) =>
  providerService.deployToCloudProvider(...args)

export const synthToProvider = (...args: Parameters<typeof synthToProviderImpl>) =>
  providerService.synthToProvider(...args)

export const nukeCloudProviderResources = (...args: Parameters<typeof nukeCloudProviderResourcesImpl>) =>
  providerService.nukeCloudProviderResources(...args)

export const startProvider = (...args: Parameters<typeof startProviderImpl>) =>
  providerService.startProvider(...args)
