import {
  MagekConfig,
  HealthAuthorizer,
  HealthEnvelope,
  HealthIndicatorMetadata,
  HealthIndicatorResult,
  HealthIndicatorsResult,
  HealthStatus,
  UserEnvelope,
  createInstance,
} from '@magek/common'
import { childHealthProviders, isEnabled, metadataFromId, rootHealthProviders } from './health-utils'
import { defaultMagekHealthIndicators } from './health-indicators'
import { MagekTokenVerifier } from '../../token-verifier'
import { MagekAuthorizer } from '../../authorizer'

/**
 * This class is in charge of handling the health check requests
 * and dispatching the health checks to the corresponding health indicators
 */
export class MagekHealthService {
  constructor(readonly config: MagekConfig) {}

  public async health(request: unknown): Promise<unknown> {
    try {
      const healthEnvelope: HealthEnvelope = this.config.runtime.sensor.rawRequestToHealthEnvelope(request)
      await this.validate(healthEnvelope)
      const healthProviders = this.getHealthProviders()
      const parents = this.parentsHealthProviders(healthEnvelope, healthProviders)
      const healthIndicatorResults = await this.healthProviderResolver(parents, healthProviders)

      // Check if all components are healthy
      const isHealthy = this.isOverallHealthy(healthIndicatorResults)

      // Use the new health specific response handler
      return await this.config.runtime.api.healthRequestResult(healthIndicatorResults, isHealthy)
    } catch (e) {
      return await this.config.runtime.api.requestFailed(e)
    }
  }

  private async validate(healthEnvelope: HealthEnvelope): Promise<void> {
    const userEnvelope = await this.verify(healthEnvelope)
    const authorizer = MagekAuthorizer.build(
      this.config.sensorConfiguration.health.globalAuthorizer
    ) as HealthAuthorizer
    await authorizer(userEnvelope, healthEnvelope)
  }

  private async healthProviderResolver(
    healthIndicatorsMetadata: Array<HealthIndicatorMetadata>,
    healthProviders: Record<string, HealthIndicatorMetadata>
  ): Promise<Array<HealthIndicatorsResult>> {
    const result: Array<HealthIndicatorsResult> = []
    for (const current of healthIndicatorsMetadata) {
      const indicatorResult = await this.enabledIndicatorHealth(current, healthProviders)
      if (!indicatorResult) {
        continue
      }
      const children = childHealthProviders(current, healthProviders)

      // Check if the result is already a HealthIndicatorsResult (has name and id)
      const isHealthIndicatorsResult = 'name' in indicatorResult && 'id' in indicatorResult

      const newResult: HealthIndicatorsResult = {
        ...indicatorResult,
        name: isHealthIndicatorsResult
          ? (indicatorResult as HealthIndicatorsResult).name
          : current.healthIndicatorConfiguration.name,
        id: current.healthIndicatorConfiguration.id,
      }
      if (children && children?.length > 0) {
        newResult.components = await this.healthProviderResolver(children, healthProviders)
      }
      result.push(newResult)
    }
    return result
  }

  private async enabledIndicatorHealth(
    current: HealthIndicatorMetadata,
    healthProviders: Record<string, HealthIndicatorMetadata>
  ): Promise<HealthIndicatorResult | undefined> {
    if (isEnabled(current, healthProviders)) {
      return await this.indicatorHealth(current)
    }
    return
  }

  private async indicatorHealth(metadata: HealthIndicatorMetadata): Promise<HealthIndicatorResult> {
    const rootClass = metadata.class
    const instance = createInstance(rootClass, {})
    const healthIndicatorResult = await instance.health(this.config, metadata)
    if (!metadata.healthIndicatorConfiguration.details) {
      healthIndicatorResult.details = undefined
    }
    return healthIndicatorResult
  }

  /**
   * If there is not any indicator configured, then we will use only the Magek indicators.
   * @private
   */
  private getHealthProviders(): Record<string, HealthIndicatorMetadata> {
    return Object.keys(this.config.userHealthIndicators).length !== 0
      ? this.config.userHealthIndicators
      : defaultMagekHealthIndicators(this.config)
  }

  private parentsHealthProviders(
    envelope: HealthEnvelope,
    healthProviders: Record<string, HealthIndicatorMetadata>
  ): Array<HealthIndicatorMetadata> {
    const componentPath = envelope.componentPath
    if (!componentPath || componentPath.length === 0) {
      return rootHealthProviders(healthProviders)
    }

    return [metadataFromId(healthProviders, componentPath)]
  }

  private async verify(envelope: HealthEnvelope): Promise<UserEnvelope | undefined> {
    const tokenVerifier = new MagekTokenVerifier(this.config)
    const token = envelope.token
    if (!token) {
      return
    }
    return await tokenVerifier.verify(token)
  }

  private isOverallHealthy(results: Array<HealthIndicatorsResult>): boolean {
    for (const result of results) {
      // Check current component's status
      if (result.status !== HealthStatus.UP) {
        return false
      }

      // Recursively check child components if they exist
      if (result.components && result.components.length > 0) {
        if (!this.isOverallHealthy(result.components)) {
          return false
        }
      }
    }
    return true
  }
}
