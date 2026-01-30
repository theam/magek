import { expect } from '../expect'
import { HealthSensor } from '../../src/decorators/'
import { Magek } from '../../src'
import {
  MagekConfig,
  HealthIndicatorResult,
  HealthStatus,
  HealthIndicatorMetadata,
} from '@magek/common'

describe('the `HealthSensor` decorator', () => {
  afterEach(() => {
    Magek.configureCurrentEnv((config: MagekConfig) => {
      for (const propName in config.userHealthIndicators) {
        delete config.userHealthIndicators[propName]
      }
    })
  })

  it('registers the health indicator in config.userHealthIndicators', () => {
    @HealthSensor({
      id: 'custom/service',
      name: 'Custom Service Health',
      enabled: true,
      details: true,
    })
    class CustomServiceHealthIndicator {
      public async health(_config: MagekConfig, _metadata: HealthIndicatorMetadata): Promise<HealthIndicatorResult> {
        return { status: HealthStatus.UP }
      }
    }

    const indicatorMetadata = Magek.config.userHealthIndicators['custom/service']

    expect(indicatorMetadata).to.be.an('object')
    expect(indicatorMetadata.class).to.equal(CustomServiceHealthIndicator)
    expect(indicatorMetadata.healthIndicatorConfiguration).to.deep.include({
      id: 'custom/service',
      name: 'Custom Service Health',
      enabled: true,
      details: true,
    })
  })

  it('stores all configuration options including showChildren', () => {
    @HealthSensor({
      id: 'database/primary',
      name: 'Primary Database',
      enabled: true,
      details: false,
      showChildren: false,
    })
    class DatabaseHealthIndicator {
      public async health(_config: MagekConfig, _metadata: HealthIndicatorMetadata): Promise<HealthIndicatorResult> {
        return { status: HealthStatus.UP }
      }
    }

    const indicatorMetadata = Magek.config.userHealthIndicators['database/primary']

    expect(indicatorMetadata.healthIndicatorConfiguration).to.deep.equal({
      id: 'database/primary',
      name: 'Primary Database',
      enabled: true,
      details: false,
      showChildren: false,
    })

    // Suppress unused variable warning
    void DatabaseHealthIndicator
  })

  it('defaults showChildren to true when not specified', () => {
    @HealthSensor({
      id: 'cache/redis',
      name: 'Redis Cache',
      enabled: true,
      details: true,
    })
    class RedisHealthIndicator {
      public async health(_config: MagekConfig, _metadata: HealthIndicatorMetadata): Promise<HealthIndicatorResult> {
        return { status: HealthStatus.UP }
      }
    }

    const indicatorMetadata = Magek.config.userHealthIndicators['cache/redis']

    expect(indicatorMetadata.healthIndicatorConfiguration.showChildren).to.equal(true)

    // Suppress unused variable warning
    void RedisHealthIndicator
  })

  it('allows registering multiple health indicators', () => {
    @HealthSensor({
      id: 'service/api',
      name: 'API Service',
      enabled: true,
      details: true,
    })
    class ApiHealthIndicator {
      public async health(_config: MagekConfig, _metadata: HealthIndicatorMetadata): Promise<HealthIndicatorResult> {
        return { status: HealthStatus.UP }
      }
    }

    @HealthSensor({
      id: 'service/worker',
      name: 'Worker Service',
      enabled: false,
      details: false,
    })
    class WorkerHealthIndicator {
      public async health(_config: MagekConfig, _metadata: HealthIndicatorMetadata): Promise<HealthIndicatorResult> {
        return { status: HealthStatus.DOWN }
      }
    }

    expect(Magek.config.userHealthIndicators['service/api'].class).to.equal(ApiHealthIndicator)
    expect(Magek.config.userHealthIndicators['service/worker'].class).to.equal(WorkerHealthIndicator)
    expect(Magek.config.userHealthIndicators['service/api'].healthIndicatorConfiguration.enabled).to.equal(true)
    expect(Magek.config.userHealthIndicators['service/worker'].healthIndicatorConfiguration.enabled).to.equal(false)
  })

  it('stores disabled indicator configuration correctly', () => {
    @HealthSensor({
      id: 'disabled/indicator',
      name: 'Disabled Indicator',
      enabled: false,
      details: false,
      showChildren: false,
    })
    class DisabledHealthIndicator {
      public async health(_config: MagekConfig, _metadata: HealthIndicatorMetadata): Promise<HealthIndicatorResult> {
        return { status: HealthStatus.UNKNOWN }
      }
    }

    const indicatorMetadata = Magek.config.userHealthIndicators['disabled/indicator']

    expect(indicatorMetadata.healthIndicatorConfiguration.enabled).to.equal(false)
    expect(indicatorMetadata.healthIndicatorConfiguration.details).to.equal(false)
    expect(indicatorMetadata.healthIndicatorConfiguration.showChildren).to.equal(false)

    // Suppress unused variable warning
    void DisabledHealthIndicator
  })
})
