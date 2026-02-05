---
title: "Sensors"
group: "Advanced"
---

# Sensors

Sensors are monitoring components in Magek that track and report the status of your application. They provide visibility into application health and performance through HTTP endpoints.

## Overview

Magek's sensor system allows you to:

- Monitor the health status of application components
- Expose status information via REST endpoints
- Create custom monitoring for your own services
- Integrate with external monitoring tools and dashboards

## Health Sensors

The primary sensor type in Magek is the **Health Sensor**, which monitors application health and exposes status via the `/sensor/health/` endpoint.

### Built-in Health Indicators

Magek provides these built-in health indicators:

| Indicator | Endpoint | Description |
|-----------|----------|-------------|
| `magek` | `/sensor/health/magek` | Overall application health |
| `magek/function` | `/sensor/health/magek/function` | GraphQL function status, CPU, and memory |
| `magek/database` | `/sensor/health/magek/database` | Database availability |
| `magek/database/events` | `/sensor/health/magek/database/events` | Event store health |
| `magek/database/readmodels` | `/sensor/health/magek/database/readmodels` | Read model store health |

### Quick Start

Enable health sensors in your configuration:

```typescript
Magek.configure('local', (config: MagekConfig): void => {
  config.appName = 'my-app'
  config.runtime = ServerRuntime

  // Enable all health indicators
  Object.values(config.sensorConfiguration.health.magek).forEach((indicator) => {
    indicator.enabled = true
  })
})
```

Then access health status at `http://localhost:3000/sensor/health/`.

### Creating Custom Health Sensors

Use the `@HealthSensor` decorator to create custom health indicators:

```typescript
import {
  MagekConfig,
  HealthIndicatorResult,
  HealthIndicatorMetadata,
  HealthStatus,
} from '@magek/common'
import { HealthSensor } from '@magek/core'

@HealthSensor({
  id: 'external-api',
  name: 'External API Health',
  enabled: true,
  details: true,
})
export class ExternalApiHealthIndicator {
  public async health(
    config: MagekConfig,
    metadata: HealthIndicatorMetadata
  ): Promise<HealthIndicatorResult> {
    // Check your external service
    const isHealthy = await checkExternalApi()

    return {
      status: isHealthy ? HealthStatus.UP : HealthStatus.DOWN,
      details: {
        lastCheck: new Date().toISOString(),
      },
    }
  }
}
```

### Health Statuses

| Status | Description |
|--------|-------------|
| `UP` | Component is working as expected |
| `PARTIALLY_UP` | Component has reduced functionality |
| `DOWN` | Component is not working |
| `OUT_OF_SERVICE` | Component is temporarily unavailable |
| `UNKNOWN` | Component state cannot be determined |

### HTTP Response Codes

- **200 OK**: All components are healthy (`UP`)
- **503 Service Unavailable**: One or more components are unhealthy

## Configuration Options

Each health indicator supports these options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `string` | required | Unique identifier (used in URL path) |
| `name` | `string` | required | Display name in responses |
| `enabled` | `boolean` | `false` | Enable/disable the indicator |
| `details` | `boolean` | `true` | Include detailed information |
| `showChildren` | `boolean` | `true` | Include child components |

## Related Topics

- [Health Sensor Details](health/sensor-health.md) - Complete health monitoring guide with all configuration options, response formats, and examples
