import { eventsDatabase, readModelsDatabase } from '../paths'
import { localPort, HealthEnvelope, UUID, request } from '@magek/common'
import { existsSync } from 'fs'
import { FastifyRequest } from 'fastify'
import Nedb from '@seald-io/nedb'

export async function databaseUrl(): Promise<Array<string>> {
  return [eventsDatabase, readModelsDatabase]
}

export async function countAll(database: Nedb): Promise<number> {
  await database.loadDatabaseAsync()
  const count = await database.countAsync({})
  return count ?? 0
}

export async function graphqlFunctionUrl(): Promise<string> {
  try {
    const port = localPort()
    return `http://localhost:${port}/graphql`
  } catch (e) {
    return ''
  }
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

function rawRequestToSensorHealthComponentPath(rawRequest: FastifyRequest): string {
  // For health requests, the component path is typically in the URL path
  // Since we don't have a direct url property, we'll construct it from params
  const params = rawRequest.params
  if (params && Object.keys(params).length > 0) {
    // If there are path parameters, join them to create the component path
    return Object.values(params).filter(Boolean).join('/')
  }
  return ''
}

export function rawRequestToSensorHealth(rawRequest: FastifyRequest): HealthEnvelope {
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
