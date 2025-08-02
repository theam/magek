import {
  HEALTH_INDICATORS_IDS,
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
  id: HEALTH_INDICATORS_IDS,
  name: string,
  healthIndicator: Class<HealthIndicatorInterface>
): HealthIndicatorMetadata {
  const health = config.sensorConfiguration.health
  return {
    class: healthIndicator,
    healthIndicatorConfiguration: {
      id: id,
      name: name,
      enabled: health.magek[id].enabled,
      details: health.magek[id].details,
      showChildren: health.magek[id].showChildren,
    },
  }
}

/**
 * Magek configured HealthIndicators
 */
export function defaultMagekHealthIndicators(config: MagekConfig): Record<string, HealthIndicatorMetadata> {
  const root = buildMetadata(config, HEALTH_INDICATORS_IDS.ROOT, 'Magek', MagekHealthIndicator)
  const magekFunction = buildMetadata(
    config,
    HEALTH_INDICATORS_IDS.FUNCTION,
    'Magek Function',
    MagekFunctionHealthIndicator
  )
  const magekDatabase = buildMetadata(
    config,
    HEALTH_INDICATORS_IDS.DATABASE,
    'Magek Database',
    MagekDatabaseHealthIndicator
  )
  const databaseEvents = buildMetadata(
    config,
    HEALTH_INDICATORS_IDS.DATABASE_EVENTS,
    'Magek Database Events',
    MagekDatabaseEventsHealthIndicator
  )
  const databaseReadModels = buildMetadata(
    config,
    HEALTH_INDICATORS_IDS.DATABASE_READ_MODELS,
    'Magek Database ReadModels',
    MagekDatabaseReadModelsHealthIndicator
  )
  const rocketFunctions = buildMetadata(
    config,
    HEALTH_INDICATORS_IDS.ROCKETS,
    'Rockets',
    RocketsHealthIndicator
  )
  return {
    [root.healthIndicatorConfiguration.id]: root,
    [magekFunction.healthIndicatorConfiguration.id]: magekFunction,
    [magekDatabase.healthIndicatorConfiguration.id]: magekDatabase,
    [databaseEvents.healthIndicatorConfiguration.id]: databaseEvents,
    [databaseReadModels.healthIndicatorConfiguration.id]: databaseReadModels,
    [rocketFunctions.healthIndicatorConfiguration.id]: rocketFunctions,
  }
}
