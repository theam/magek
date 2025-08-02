import {
  MagekConfig,
  HealthIndicatorResult,
  HealthIndicatorMetadata,
  HealthStatus,
} from '@magek/common'
import { magekVersion } from './version'

export class MagekHealthIndicator {
  public async health(
    config: MagekConfig,
    healthIndicatorMetadata: HealthIndicatorMetadata
  ): Promise<HealthIndicatorResult> {
    try {
      const result: HealthIndicatorResult = {
        status: await this.isUp(config),
      }
      if (healthIndicatorMetadata.healthIndicatorConfiguration.details) {
        result.details = {
          magekVersion: magekVersion(config),
        }
      }
      return result
    } catch (e) {
      return { status: HealthStatus.DOWN, details: e }
    }
  }

  private async isUp(config: MagekConfig): Promise<HealthStatus> {
    const graphqlUp = await config.provider.sensor.isGraphQLFunctionUp(config)
    const databaseEvents = await config.provider.sensor.isDatabaseEventUp(config)
    const databaseReadModels = await config.provider.sensor.areDatabaseReadModelsUp(config)
    return graphqlUp && databaseEvents && databaseReadModels ? HealthStatus.UP : HealthStatus.DOWN
  }
}
