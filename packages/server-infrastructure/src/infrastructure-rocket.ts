import { BoosterConfig } from '@booster-ai/common'
import { Router } from 'express'

export interface InfrastructureRocketMetadata {
  port: number
}

export interface InfrastructureRocket {
  mountStack: (
    config: BoosterConfig,
    router: Router,
    infrastructureRocketMetadata?: InfrastructureRocketMetadata
  ) => void
  unmountStack?: () => void
}
