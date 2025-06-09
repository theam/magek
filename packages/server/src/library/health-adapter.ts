import { EventRegistry, ReadModelRegistry } from '../services'
import { eventsDatabase, readModelsDatabase } from '../paths'
import { BoosterConfig, boosterLocalPort, HealthEnvelope, UUID, request } from '@booster-ai/common'
import { existsSync } from 'fs'
import { HttpRequest } from './request-types'
import Nedb from '@seald-io/nedb'

export async function databaseUrl(): Promise<Array<string>> {
  return [eventsDatabase, readModelsDatabase]
}

export async function countAll(database: Nedb): Promise<number> {
  await database.loadDatabaseAsync()
  const count = await database.countAsync({})
  return count ?? 0
}

export async function databaseEventsHealthDetails(eventRegistry: EventRegistry): Promise<unknown> {
  const count = await countAll(eventRegistry.events)
  return {
    file: eventsDatabase,
    count: count,
  }
}

export async function graphqlFunctionUrl(): Promise<string> {
  try {
    const port = boosterLocalPort()
    return `http://localhost:${port}/graphql`
  } catch (e) {
    return ''
  }
}

export async function isDatabaseEventUp(): Promise<boolean> {
  return existsSync(eventsDatabase)
}

export async function areDatabaseReadModelsUp(): Promise<boolean> {
  return existsSync(readModelsDatabase)
}

export async function isGraphQLFunctionUp(): Promise<boolean> {
  try {
    const url = await graphqlFunctionUrl()
    const response = await request(
      url,
      'POST',
      JSON.stringify({
        query: 'query { __typename }',
      })
    )
    return response.status === 200
  } catch (e) {
    return false
  }
}

function rawRequestToSensorHealthComponentPath(rawRequest: HttpRequest): string {
  // For health requests, the component path is typically in the URL path
  // Since we don't have a direct url property, we'll construct it from params
  const params = rawRequest.params
  if (params && Object.keys(params).length > 0) {
    // If there are path parameters, join them to create the component path
    return Object.values(params).filter(Boolean).join('/')
  }
  return ''
}

export function rawRequestToSensorHealth(rawRequest: HttpRequest): HealthEnvelope {
  const componentPath = rawRequestToSensorHealthComponentPath(rawRequest)
  const requestID = UUID.generate()
  const headers = rawRequest.headers
  return {
    requestID: requestID,
    context: {
      request: {
        headers: headers,
        body: rawRequest.body || {},
      },
      rawContext: rawRequest,
    },
    componentPath: componentPath,
    token: Array.isArray(headers?.authorization) ? headers.authorization[0] : headers?.authorization,
  }
}

export async function databaseReadModelsHealthDetails(readModelRegistry: ReadModelRegistry): Promise<unknown> {
  const count = await countAll(readModelRegistry.readModels)
  return {
    file: readModelsDatabase,
    count: count,
  }
}

export async function areRocketFunctionsUp(config: BoosterConfig): Promise<{ [key: string]: boolean }> {
  // In local provider, rockets run in the same process, so they're always "up" if configured
  const results: { [key: string]: boolean } = {}
  if (config.rockets) {
    for (const rocket of config.rockets) {
      const params = rocket.parameters as { rocketProviderPackage: string }
      if (params?.rocketProviderPackage) {
        const basePackage = params.rocketProviderPackage
          .replace(/^@[^/]+\//, '') // Remove scope (@org/)
          .replace(/-[^-]+$/, '') // Remove last segment after dash (provider)
        results[basePackage] = true
      }
    }
  }
  return results
}
