import { MagekConfig } from './config'
import {
  GraphQLRequestEnvelope,
  GraphQLRequestEnvelopeError,
  HealthEnvelope,
  ScheduledCommandEnvelope,
} from './envelope'

export interface Runtime {
  graphQL: GraphQLRuntime
  api: APIRuntime
  messaging: MessagingRuntime
  scheduled: ScheduledRuntime
  sensor: SensorRuntime
}

/**
 * Runtime messaging adapter for pushing data to client connections.
 */
export interface MessagingRuntime {
  /**
   * Sends a message to a specific connection.
   *
   * @param config - The Magek configuration object.
   * @param connectionID - The ID of the connection.
   * @param data - The data to be sent to the connection.
   * @returns A promise that resolves when the message has been sent successfully.
   */
  sendMessage(config: MagekConfig, connectionID: string, data: unknown): Promise<void>
}


export interface SensorRuntime {
  databaseEventsHealthDetails(config: MagekConfig): Promise<unknown>
  databaseReadModelsHealthDetails(config: MagekConfig): Promise<unknown>
  isDatabaseEventUp(config: MagekConfig): Promise<boolean>
  areDatabaseReadModelsUp(config: MagekConfig): Promise<boolean>
  databaseUrls(config: MagekConfig): Promise<Array<string>>
  isGraphQLFunctionUp(config: MagekConfig): Promise<boolean>
  graphQLFunctionUrl(config: MagekConfig): Promise<string>
  rawRequestToHealthEnvelope(rawRequest: unknown): HealthEnvelope
}

export interface GraphQLRuntime {
  /**
   * Converts a raw GraphQL request to a `GraphQLRequestEnvelope` or a `GraphQLRequestEnvelopeError`.
   *
   * @param config - The Magek configuration object.
   * @param rawGraphQLRequest - The raw GraphQL request to be converted.
   * @returns A promise that resolves to either a `GraphQLRequestEnvelope` or a `GraphQLRequestEnvelopeError` object.
   */
  rawToEnvelope(
    config: MagekConfig,
    rawGraphQLRequest: unknown
  ): Promise<GraphQLRequestEnvelope | GraphQLRequestEnvelopeError>

  /**
   * Handles the result of a GraphQL request.
   *
   * @param result - The result of the GraphQL request (optional).
   * @param headers - The headers associated with the GraphQL request result (optional).
   * @returns A promise that resolves to any value.
   */
  handleResult(result?: unknown, headers?: Record<string, string>): Promise<unknown>
}

export interface APIRuntime {
  /**
   * Handles a successful API request by returning the response body.
   *
   * @param body - The response body of the API request.
   * @param headers - The headers of the API request.
   * @returns A promise that resolves with the response body.
   */
  requestSucceeded(body?: unknown, headers?: Record<string, number | string | ReadonlyArray<string>>): Promise<unknown>

  /**
   * Handles a failed API request by returning an error.
   *
   * @param error - The error that occurred during the API request.
   * @returns A promise that resolves with the error.
   */
  requestFailed(error: Error): Promise<unknown>

  /**
   * Handles a health check response with appropriate status code.
   *
   * @param body - The health check results
   * @param isHealthy - Whether all the components are UP
   * @returns A promise that resolves with the response
   */
  healthRequestResult(body: unknown, isHealthy: boolean): Promise<unknown>
}

export interface ScheduledRuntime {
  /**
   * Converts a raw message into a `ScheduledCommandEnvelope`.
   *
   * @param config - The configuration for the application.
   * @param rawMessage - The raw message to convert.
   * @returns A promise that resolves with the `ScheduledCommandEnvelope` representation of the raw message.
   */
  rawToEnvelope(config: MagekConfig, rawMessage: unknown): Promise<ScheduledCommandEnvelope>
}
