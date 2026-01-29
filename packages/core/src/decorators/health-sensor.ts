import {
  Class,
  HealthIndicatorConfiguration,
  HealthIndicatorInterface,
  HealthIndicatorMetadata,
} from '@magek/common'
import { Magek } from '../magek'
import { defaultMagekHealthIndicators } from '../sensor/health/health-indicators'
import { Stage3ClassContext } from './stage3-utils'

/**
 * Decorator to mark a class as a Magek Health Sensor.
 * Health sensors provide health status information for monitoring endpoints.
 *
 * Uses TC39 Stage 3 decorators.
 *
 * @param attributes - Health indicator configuration
 * @param attributes.id - Unique indicator identifier
 * @param attributes.name - Indicator description
 * @param attributes.enabled - If false, this indicator and its children will be skipped
 * @param attributes.details - If false, the indicator will not include details
 * @param attributes.showChildren - If false, children components won't be included in the tree
 * @returns A class decorator function
 */
export function HealthSensor(
  attributes: HealthIndicatorConfiguration
): <TIndicator extends HealthIndicatorInterface>(healthIndicator: Class<TIndicator>, context: Stage3ClassContext) => void {
  return (healthIndicator) => {
    Magek.configureCurrentEnv((config): void => {
      if (Object.keys(config.userHealthIndicators).length === 0) {
        config.userHealthIndicators = defaultMagekHealthIndicators(config)
      }
      const path = attributes.id
      config.userHealthIndicators[path] = {
        class: healthIndicator,
        healthIndicatorConfiguration: {
          id: attributes.id,
          name: attributes.name,
          enabled: attributes.enabled,
          details: attributes.details,
          showChildren: attributes.showChildren ?? true,
        },
      } as HealthIndicatorMetadata
    })
  }
}
