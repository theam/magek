import { MagekConfig } from './config'
import {
  GraphQLRequestEnvelope,
  GraphQLRequestEnvelopeError,
  HealthEnvelope,
  ScheduledCommandEnvelope,
} from './envelope'
import { RocketDescriptor, RocketEnvelope } from './rockets'

export interface ProviderLibrary {
  graphQL: ProviderGraphQLLibrary
  api: ProviderAPIHandling
  scheduled: ScheduledCommandsLibrary
  infrastructure: () => ProviderInfrastructure
  rockets: ProviderRocketLibrary
  sensor: ProviderSensorLibrary
}

export interface ProviderRocketLibrary {
  rawToEnvelopes(config: MagekConfig, request: unknown): RocketEnvelope
}

export interface ProviderSensorLibrary {
  databaseEventsHealthDetails(config: MagekConfig): Promise<unknown>
  databaseReadModelsHealthDetails(config: MagekConfig): Promise<unknown>
  isDatabaseEventUp(config: MagekConfig): Promise<boolean>
  areDatabaseReadModelsUp(config: MagekConfig): Promise<boolean>
  databaseUrls(config: MagekConfig): Promise<Array<string>>
  isGraphQLFunctionUp(config: MagekConfig): Promise<boolean>
  graphQLFunctionUrl(config: MagekConfig): Promise<string>
  rawRequestToHealthEnvelope(rawRequest: unknown): HealthEnvelope
  areRocketFunctionsUp(config: MagekConfig): Promise<{ [key: string]: boolean }>
}

export interface ProviderGraphQLLibrary {
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

export interface ProviderAPIHandling {
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
   * @param isHealthy - Whether all the components (except UNKNOWN rockets) are UP
   * @returns A promise that resolves with the response
   */
  healthRequestResult(body: unknown, isHealthy: boolean): Promise<unknown>
}

export interface ProviderInfrastructure {
  /**
   * Deploys the application.
   *
   * @param config - The configuration for the application.
   * @returns A promise that resolves when the deployment is complete.
   */
  deploy?: (config: MagekConfig) => Promise<void>

  /**
   * Deletes all resources created by the application.
   *
   * @param config - The configuration for the application.
   * @returns A promise that resolves when the deletion is complete.
   */
  nuke?: (config: MagekConfig) => Promise<void>

  /**
   * Starts the application.
   *
   * @param config - The configuration for the application.
   * @param port - The port number to start the application on.
   * @returns A promise that resolves when the application has started.
   */
  start?: (config: MagekConfig, port: number) => Promise<void>

  /**
   * Synthesizes the application.
   *
   * @param config - The configuration for the application.
   * @returns A promise that resolves when the synthesis is complete.
   */
  synth?: (config: MagekConfig) => Promise<void>
}

export interface ScheduledCommandsLibrary {
  /**
   * Converts a raw message into a `ScheduledCommandEnvelope`.
   *
   * @param config - The configuration for the application.
   * @param rawMessage - The raw message to convert.
   * @returns A promise that resolves with the `ScheduledCommandEnvelope` representation of the raw message.
   */
  rawToEnvelope(config: MagekConfig, rawMessage: unknown): Promise<ScheduledCommandEnvelope>
}

export interface HasInfrastructure {
  /**
   * Creates a `ProviderInfrastructure` instance.
   *
   * @param rockets - An optional array of `RocketDescriptor` objects.
   * @returns A `ProviderInfrastructure` instance.
   */
  Infrastructure: (rockets?: RocketDescriptor[]) => ProviderInfrastructure
}
