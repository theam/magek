import { BoosterConfig, RocketEnvelope, rocketFunctionIDEnvVar } from '@magek/common'

export function rawRocketInputToEnvelope(config: BoosterConfig, request: unknown): RocketEnvelope {
  const idFromRequest = (request as any)[rocketFunctionIDEnvVar]
  const id = idFromRequest ?? process.env[rocketFunctionIDEnvVar]
  return {
    rocketId: id,
  }
}
