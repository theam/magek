import { MagekConfig, RocketEnvelope, rocketFunctionIDEnvVar } from '@magek/common'

export function rawRocketInputToEnvelope(config: MagekConfig, request: unknown): RocketEnvelope {
  const idFromRequest = (request as any)[rocketFunctionIDEnvVar]
  const id = idFromRequest ?? process.env[rocketFunctionIDEnvVar]
  return {
    rocketId: id,
  }
}
