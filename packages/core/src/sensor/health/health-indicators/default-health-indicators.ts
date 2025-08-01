import {
  BOOSTER_HEALTH_INDICATORS_IDS,
  MagekConfig,
  Class,
  HealthIndicatorInterface,
  HealthIndicatorMetadata,
} from '@magek/common'
import { MagekHealthIndicator } from './health-indicator'
import { MagekDatabaseHealthIndicator } from './database-health-indicator'
import { MagekDatabaseEventsHealthIndicator } from './database-events-health-indicator'
import { MagekFunctionHealthIndicator } from './function-health-indicator'
import { MagekDatabaseReadModelsHealthIndicator } from './database-read-models-health-indicator'
import { RocketsHealthIndicator } from './rockets-health-indicator'

function buildMetadata(
  config: MagekConfig,
  id: BOOSTER_HEALTH_INDICATORS_IDS,
  name: string,
  healthIndicator: Class<HealthIndicatorInterface>
): HealthIndicatorMetadata {
  const health = config.sensorConfiguration.health
  return {
    class: healthIndicator,
    healthIndicatorConfiguration: {
      id: id,
      name: name,
      enabled: health.booster[id].enabled,
      details: health.booster[id].details,
      showChildren: health.booster[id].showChildren,
    },
  }
}

/**
 * Magek configured HealthIndicators
 */
export function defaultMagekHealthIndicators(config: MagekConfig): Record<string, HealthIndicatorMetadata> {
  const root = buildMetadata(config, BOOSTER_HEALTH_INDICATORS_IDS.ROOT, 'Magek', MagekHealthIndicator)
  const boosterFunction = buildMetadata(
    config,
    BOOSTER_HEALTH_INDICATORS_IDS.FUNCTION,
    'Magek Function',
    MagekFunctionHealthIndicator
  )
  const boosterDatabase = buildMetadata(
    config,
    BOOSTER_HEALTH_INDICATORS_IDS.DATABASE,
    'Magek Database',
    MagekDatabaseHealthIndicator
  )
  const databaseEvents = buildMetadata(
    config,
    BOOSTER_HEALTH_INDICATORS_IDS.DATABASE_EVENTS,
    'Magek Database Events',
    MagekDatabaseEventsHealthIndicator
  )
  const databaseReadModels = buildMetadata(
    config,
    BOOSTER_HEALTH_INDICATORS_IDS.DATABASE_READ_MODELS,
    'Magek Database ReadModels',
    MagekDatabaseReadModelsHealthIndicator
  )
  const rocketFunctions = buildMetadata(
    config,
    BOOSTER_HEALTH_INDICATORS_IDS.ROCKETS,
    'Rockets',
    RocketsHealthIndicator
  )
  return {
    [root.healthIndicatorConfiguration.id]: root,
    [boosterFunction.healthIndicatorConfiguration.id]: boosterFunction,
    [boosterDatabase.healthIndicatorConfiguration.id]: boosterDatabase,
    [databaseEvents.healthIndicatorConfiguration.id]: databaseEvents,
    [databaseReadModels.healthIndicatorConfiguration.id]: databaseReadModels,
    [rocketFunctions.healthIndicatorConfiguration.id]: rocketFunctions,
  }
}
