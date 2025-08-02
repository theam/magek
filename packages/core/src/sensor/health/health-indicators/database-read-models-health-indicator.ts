import {
  MagekConfig,
  HealthIndicatorResult,
  HealthIndicatorMetadata,
  HealthStatus,
} from '@magek/common'

export class MagekDatabaseReadModelsHealthIndicator {
  public async health(
    config: MagekConfig,
    healthIndicatorMetadata: HealthIndicatorMetadata
  ): Promise<HealthIndicatorResult> {
    try {
      const result: HealthIndicatorResult = {
        status: await this.isUp(config),
      }
      if (healthIndicatorMetadata.healthIndicatorConfiguration.details) {
        const details = await config.provider.sensor.databaseReadModelsHealthDetails(config)
        result.details = details as any
      }
      return result
    } catch (e) {
      return { status: HealthStatus.DOWN, details: e }
    }
  }

  private async isUp(config: MagekConfig): Promise<HealthStatus> {
    const databaseReadModels = await config.provider.sensor.areDatabaseReadModelsUp(config)
    return databaseReadModels ? HealthStatus.UP : HealthStatus.DOWN
  }
}
