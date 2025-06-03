import { BoosterConfig, RocketEnvelope, rocketFunctionIDEnvVar } from '@booster-ai/common'

export function rawRocketInputToEnvelope(config: BoosterConfig, request: unknown): RocketEnvelope {
  const idFromRequest = (request as any)[rocketFunctionIDEnvVar]
  const id = idFromRequest ?? process.env[rocketFunctionIDEnvVar]
  return {
    rocketId: id,
  }
}
