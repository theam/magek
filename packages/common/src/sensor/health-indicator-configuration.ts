import { HealthRoleAccess } from '../concepts'
import { MagekConfig } from '../config'
import { Class } from '../typelevel'

export enum HealthStatus {
  UP = 'UP', // The component or subsystem is working as expected
  PARTIALLY_UP = 'PARTIALLY_UP', // The component is partially working or has reduced functionality
  DOWN = 'DOWN', // The component is not working
  OUT_OF_SERVICE = 'OUT_OF_SERVICE', // The component is out of service temporarily
  UNKNOWN = 'UNKNOWN', // The component state is unknown
}

export interface HealthIndicatorResult {
  status: HealthStatus
  details?: {
    [key: string]: unknown
  }
}

export interface HealthIndicatorsResult extends HealthIndicatorResult {
  name: string
  id: string
  components?: Array<HealthIndicatorsResult>
}

export enum BOOSTER_HEALTH_INDICATORS_IDS {
  ROOT = 'booster',
  FUNCTION = 'booster/function',
  DATABASE = 'booster/database',
  DATABASE_EVENTS = 'booster/database/events',
  DATABASE_READ_MODELS = 'booster/database/readmodels',
  ROCKETS = 'rockets',
}

export const DEFAULT_HEALTH_CONFIGURATION_BOOSTER: SensorMagekHealthConfigurationDetails = {
  enabled: false,
  details: true,
  showChildren: true,
}

export const DEFAULT_SENSOR_HEALTH_BOOSTER_CONFIGURATIONS: Record<
  BOOSTER_HEALTH_INDICATORS_IDS,
  SensorMagekHealthConfigurationDetails
> = {
  [BOOSTER_HEALTH_INDICATORS_IDS.ROOT]: { ...DEFAULT_HEALTH_CONFIGURATION_BOOSTER },
  [BOOSTER_HEALTH_INDICATORS_IDS.FUNCTION]: { ...DEFAULT_HEALTH_CONFIGURATION_BOOSTER },
  [BOOSTER_HEALTH_INDICATORS_IDS.DATABASE]: { ...DEFAULT_HEALTH_CONFIGURATION_BOOSTER },
  [BOOSTER_HEALTH_INDICATORS_IDS.DATABASE_EVENTS]: { ...DEFAULT_HEALTH_CONFIGURATION_BOOSTER },
  [BOOSTER_HEALTH_INDICATORS_IDS.DATABASE_READ_MODELS]: { ...DEFAULT_HEALTH_CONFIGURATION_BOOSTER },
  [BOOSTER_HEALTH_INDICATORS_IDS.ROCKETS]: { ...DEFAULT_HEALTH_CONFIGURATION_BOOSTER },
}

export type SensorMagekHealthConfigurationDetails = HealthIndicatorConfigurationBase

export interface SensorMagekHealthConfiguration {
  globalAuthorizer: HealthRoleAccess
  booster: {
    [BOOSTER_HEALTH_INDICATORS_IDS.ROOT]: SensorMagekHealthConfigurationDetails
    [BOOSTER_HEALTH_INDICATORS_IDS.FUNCTION]: SensorMagekHealthConfigurationDetails
    [BOOSTER_HEALTH_INDICATORS_IDS.DATABASE]: SensorMagekHealthConfigurationDetails
    [BOOSTER_HEALTH_INDICATORS_IDS.DATABASE_EVENTS]: SensorMagekHealthConfigurationDetails
    [BOOSTER_HEALTH_INDICATORS_IDS.DATABASE_READ_MODELS]: SensorMagekHealthConfigurationDetails
    [BOOSTER_HEALTH_INDICATORS_IDS.ROCKETS]: SensorMagekHealthConfigurationDetails
  }
}

export interface SensorConfiguration {
  health: SensorMagekHealthConfiguration
}

export interface HealthIndicatorInterface {
  health: (config: MagekConfig, healthIndicatorMetadata: HealthIndicatorMetadata) => Promise<HealthIndicatorResult>
}

export interface HealthIndicatorConfigurationBase {
  enabled: boolean
  details: boolean
  showChildren?: boolean
}

export interface HealthIndicatorConfiguration extends HealthIndicatorConfigurationBase {
  id: string
  name: string
}

export interface HealthIndicatorMetadata {
  readonly class: Class<HealthIndicatorInterface>
  readonly healthIndicatorConfiguration: HealthIndicatorConfiguration
}
