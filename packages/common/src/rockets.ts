import { MagekConfig } from './config'

export const rocketFunctionIDEnvVar = 'BOOSTER_ROCKET_FUNCTION_ID'

export type RocketFunction = (config: MagekConfig, request: unknown) => Promise<unknown>

export interface RocketDescriptor {
  packageName: string
  parameters: unknown
}

export interface RocketEnvelope {
  rocketId: string | undefined
}
