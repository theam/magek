import { MagekConfig } from './config'

/**
 * `UserApp` represents the expected interface when we `require` the `dist/index.js` file of a Magek app
 */
export interface UserApp {
  Magek: {
    config: MagekConfig
    configureCurrentEnv(configurator: (config: MagekConfig) => void): void
    configuredEnvironments: Set<string>
  }
  eventDispatcher(_: unknown): Promise<void>
  graphQLDispatcher(_: unknown): Promise<unknown>
  triggerScheduledCommands(_: unknown): Promise<void>
  notifySubscribers(_: unknown): Promise<void>
  boosterRocketDispatcher(_: unknown): Promise<unknown>
  boosterConsumeEventStream(_: unknown): Promise<unknown>
  boosterProduceEventStream(_: unknown): Promise<unknown>
  boosterHealth(_: unknown): Promise<any>
}
