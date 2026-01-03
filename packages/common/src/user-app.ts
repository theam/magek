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
  consumeEventStream(_: unknown): Promise<unknown>
  produceEventStream(_: unknown): Promise<unknown>
  health(_: unknown): Promise<any>
}
