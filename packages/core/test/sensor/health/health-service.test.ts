import { expect } from '../../expect'
import { MagekHealthService } from '../../../src/sensor'
import {
  HEALTH_INDICATORS_IDS,
  MagekConfig,
  ProviderLibrary,
  HealthIndicatorsResult,
  HealthStatus,
  Level,
} from '@magek/common'
import { fake } from 'sinon'
import createJWKSMock from 'mock-jwks'
import { faker } from '@faker-js/faker'
import { JwksUriTokenVerifier } from '../../../src'

const jwksUri = 'https://myauth0app.auth0.com/' + '.well-known/jwks.json'
const issuer = 'auth0'

describe('MagekHealthService', () => {
  const config = new MagekConfig('test')
  config.logLevel = Level.error
  let healthRequestResult: { body: HealthIndicatorsResult | Array<HealthIndicatorsResult>; isHealthy: boolean } | undefined

  before(() => {
    config.provider = {
      api: {
        requestSucceeded: fake((request: any) => request),
        requestFailed: fake((error: any) => error),
        healthRequestResult: (body: any, isHealthy: boolean) => {
          healthRequestResult = { body, isHealthy }
          return body
        },
      },
    } as unknown as ProviderLibrary
  })

  beforeEach(() => {
    Object.values(config.sensorConfiguration.health.magek).forEach((indicator) => {
      indicator.enabled = true
    })
    config.sensorConfiguration.health.globalAuthorizer = {
      authorize: 'all',
    }
    healthRequestResult = undefined
  })

  it('All indicators are UP', async () => {
    config.provider.sensor = defaultSensor()
    const result = await health(config)
    const magekFunction = getMagekFunction(result)
    const magekDatabase = getMagekDatabase(result)
    const databaseEvents = getEventDatabase(magekDatabase)
    const databaseReadModels = getReadModelsDatabase(magekDatabase)
    const expectedStatus = 'UP'
    expectMagek(result, '', expectedStatus)
    expectMagekFunction(magekFunction, '', expectedStatus)
    expectMagekDatabase(magekDatabase, expectedStatus)
    expectDatabaseEvents(databaseEvents, expectedStatus)
    expectDatabaseReadModels(databaseReadModels, expectedStatus)
  })

  it('All indicators are DOWN', async () => {
    config.provider.sensor = defaultSensor()
    config.provider.sensor.isGraphQLFunctionUp = fake.resolves(false)
    config.provider.sensor.isDatabaseEventUp = fake.resolves(false)
    config.provider.sensor.areDatabaseReadModelsUp = fake.resolves(false)
    const expectedStatus = 'DOWN'
    const result = await health(config)
    const magekFunction = getMagekFunction(result)
    const magekDatabase = getMagekDatabase(result)
    const databaseEvents = getEventDatabase(magekDatabase)
    const databaseReadModels = getReadModelsDatabase(magekDatabase)
    expectMagek(result, '', expectedStatus)
    expectMagekFunction(magekFunction, '', expectedStatus)
    expectMagekDatabase(magekDatabase, expectedStatus)
    expectDatabaseEvents(databaseEvents, expectedStatus)
    expectDatabaseReadModels(databaseReadModels, expectedStatus)
  })

  it('Details are processed', async () => {
    config.provider.sensor = defaultSensor()
    config.provider.sensor.databaseEventsHealthDetails = fake.resolves({
      test: true,
    })
    config.provider.sensor.databaseReadModelsHealthDetails = fake.resolves({
      test: true,
    })
    const result = await health(config)
    const magekFunction = getMagekFunction(result)
    const magekDatabase = getMagekDatabase(result)
    const databaseEvents = getEventDatabase(magekDatabase)
    const databaseReadModels = getReadModelsDatabase(magekDatabase)
    const expectedStatus = 'UP'
    expectMagek(result, '', expectedStatus)
    expectMagekFunction(magekFunction, '', expectedStatus)
    expectMagekDatabase(magekDatabase, expectedStatus)
    expectDatabaseEventsWithDetails(databaseEvents, expectedStatus, {
      test: true,
    })
    expectDatabaseReadModelsWithDetails(databaseReadModels, expectedStatus, {
      test: true,
    })
  })

  it('Validates with the expected Role', async () => {
    const jwks = createJWKSMock('https://myauth0app.auth0.com/')
    const stop = jwks.start()
    const token = jwks.token({
      sub: faker.string.uuid(),
      iss: issuer,
      'custom:role': 'UserRole',
      extraParam: 'claims',
      anotherParam: 111,
      email: faker.internet.email(),
      phoneNumber: faker.phone.number(),
    })
    config.provider.sensor = defaultSensor(token)
    config.sensorConfiguration.health.globalAuthorizer = {
      authorize: [UserRole],
    }
    config.tokenVerifiers = [
      new JwksUriTokenVerifier(issuer, 'https://myauth0app.auth0.com/' + '.well-known/jwks.json'),
    ]
    const result = await health(config)
    stop()
    expectMagek(result, '', 'UP')
  })

  it('Validates fails with wrong role', async () => {
    const jwks = createJWKSMock('https://myauth0app.auth0.com/')
    const stop = jwks.start()
    const token = jwks.token({
      sub: faker.string.uuid(),
      iss: issuer,
      'custom:role': 'UserRole1',
      extraParam: 'claims',
      anotherParam: 111,
      email: faker.internet.email(),
      phoneNumber: faker.phone.number(),
    })

    config.provider.sensor = defaultSensor(token)
    config.sensorConfiguration.health.globalAuthorizer = {
      authorize: [UserRole],
    }
    config.tokenVerifiers = [new JwksUriTokenVerifier(issuer, jwksUri)]
    const healthService = new MagekHealthService(config)
    const result = (await healthService.health(undefined)) as any
    stop()
    expect(result.code).to.be.eq('NotAuthorizedError')
  })

  it('Only root enabled and without children and details', async () => {
    config.provider.sensor = defaultSensor()
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.ROOT].enabled = true
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE].enabled = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_EVENTS].enabled = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_READ_MODELS].enabled = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.FUNCTION].enabled = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.ROOT].details = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE].details = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_EVENTS].details = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_READ_MODELS].details = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.FUNCTION].details = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.ROOT].showChildren = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE].showChildren = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_EVENTS].showChildren = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_READ_MODELS].showChildren = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.FUNCTION].showChildren = false

    // get root
    const result = await health(config)

    // root without children and details
    expectDefaultResult(result, 'UP', 'magek', 'Magek', 0)
    expect(result.details).to.be.undefined

    // other indicators are undefined
    expect(getMagekDatabase(result)).to.be.undefined
    expect(getEventDatabase(result)).to.be.undefined
    expect(getMagekFunction(result)).to.be.undefined
    expect(getReadModelsDatabase(result)).to.be.undefined
  })

  it('if parent disabled then children are disabled', async () => {
    config.provider.sensor = defaultSensor('', 'magek/database/readmodels')
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.ROOT].enabled = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE].enabled = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_EVENTS].enabled = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_READ_MODELS].enabled = true
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.FUNCTION].enabled = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.ROOT].details = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE].details = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_EVENTS].details = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_READ_MODELS].details = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.FUNCTION].details = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.ROOT].showChildren = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE].showChildren = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_EVENTS].showChildren = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_READ_MODELS].showChildren = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.FUNCTION].showChildren = false

    const readModelsResult = await health(config)
    expect(readModelsResult).to.be.undefined
  })

  it('Only ReadModels enabled and without children and details', async () => {
    config.provider.sensor = defaultSensor('', 'magek/database/readmodels')
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.ROOT].enabled = true
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE].enabled = true
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_EVENTS].enabled = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_READ_MODELS].enabled = true
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.FUNCTION].enabled = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.ROOT].details = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE].details = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_EVENTS].details = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_READ_MODELS].details = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.FUNCTION].details = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.ROOT].showChildren = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE].showChildren = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_EVENTS].showChildren = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.DATABASE_READ_MODELS].showChildren = false
    config.sensorConfiguration.health.magek[HEALTH_INDICATORS_IDS.FUNCTION].showChildren = false

    const readModelsResult = await health(config)
    expectDatabaseReadModels(readModelsResult, 'UP')
  })

  describe('Health Response Status', () => {
    it('returns isHealthy true when all components are UP', async () => {
      config.provider.sensor = defaultSensor()
      await health(config)
      expect(healthRequestResult?.isHealthy).to.be.true
    })

    it('returns isHealthy false when any component is DOWN', async () => {
      config.provider.sensor = defaultSensor()
      config.provider.sensor.isGraphQLFunctionUp = fake.resolves(false)
      await health(config)
      expect(healthRequestResult?.isHealthy).to.be.false
    })

    it('returns isHealthy true when rockets are UNKNOWN', async () => {
      config.provider.sensor = defaultSensor()
      config.provider.sensor.areRocketFunctionsUp = fake.resolves({}) // Empty object means no rockets
      await health(config)
      expect(healthRequestResult?.isHealthy).to.be.true
    })

    it('returns isHealthy false when rockets are DOWN', async () => {
      config.provider.sensor = defaultSensor()
      config.provider.sensor.areRocketFunctionsUp = fake.resolves({ rocket1: false })
      await health(config)
      expect(healthRequestResult?.isHealthy).to.be.false
    })

    it('returns isHealthy true when rockets are UP', async () => {
      config.provider.sensor = defaultSensor()
      config.provider.sensor.areRocketFunctionsUp = fake.resolves({ rocket1: true })
      await health(config)
      expect(healthRequestResult?.isHealthy).to.be.true
    })
  })
})

function defaultSensor(token?: string, url?: string) {
  return {
    databaseEventsHealthDetails: fake.resolves(undefined),
    databaseReadModelsHealthDetails: fake.resolves(undefined),
    isGraphQLFunctionUp: fake.resolves(true),
    isDatabaseEventUp: fake.resolves(true),
    areDatabaseReadModelsUp: fake.resolves(true),
    databaseUrls: fake.resolves([]),
    graphQLFunctionUrl: fake.resolves(''),
    rawRequestToHealthEnvelope: fake(() => {
      return { requestID: 'test-request-id', token: token, componentPath: url || '' }
    }),
    areRocketFunctionsUp: fake.resolves({ rocket1: true }),
  }
}

async function health(config: MagekConfig): Promise<HealthIndicatorsResult> {
  const healthService = new MagekHealthService(config)
  const result = (await healthService.health(undefined)) as HealthIndicatorsResult | Array<HealthIndicatorsResult>
  // For backwards compatibility with existing tests that expect the first component
  if (Array.isArray(result)) {
    return result[0]
  }
  return result
}

function getMagekFunction(result: HealthIndicatorsResult | undefined) {
  return result?.components?.find((element: HealthIndicatorsResult) => element.id === 'magek/function')
}

function getMagekDatabase(result: HealthIndicatorsResult | undefined) {
  return result?.components?.find((element: HealthIndicatorsResult) => element.id === 'magek/database')
}

function getEventDatabase(magekDatabase: HealthIndicatorsResult | undefined) {
  return magekDatabase?.components?.find((element: HealthIndicatorsResult) => element.id === 'magek/database/events')
}

function getReadModelsDatabase(magekDatabase: HealthIndicatorsResult | undefined) {
  return magekDatabase?.components?.find((element: HealthIndicatorsResult) => element.id === 'magek/database/readmodels')
}

function expectDefaultResult(
  result: HealthIndicatorsResult | undefined,
  status: HealthStatus | string,
  id: string,
  name: string,
  componentsLength: number
) {
  expect(result).to.not.be.undefined
  const resultNonNull = result as HealthIndicatorsResult
  expect(resultNonNull.id).to.be.eq(id)
  expect(resultNonNull.status).to.be.eq(status)
  expect(resultNonNull.name).to.be.eq(name)
  if (componentsLength === 0) {
    expect(resultNonNull.components).to.be.undefined
  } else {
    expect(resultNonNull.components!.length).to.be.eq(componentsLength)
  }
}

function expectMagek(
  result: HealthIndicatorsResult | undefined,
  version: string,
  status: HealthStatus | string
): void {
  expectDefaultResult(result, status, 'magek', 'Magek', 2)
  expect(result!.details!.magekVersion).to.be.eq(version)
}

function expectMagekFunction(
  magekFunction: HealthIndicatorsResult | undefined,
  url: string,
  status: HealthStatus | string
) {
  expectDefaultResult(magekFunction, status, 'magek/function', 'Magek Function', 0)
  const details = magekFunction!.details as any
  expect(details.cpus.length).to.be.gt(0)
  expect(details.cpus[0].timesPercentages.length).to.be.gt(0)
  expect(details.memory.totalBytes).to.be.gt(0)
  expect(details.memory.freeBytes).to.be.gt(0)
  expect(details.graphQL_url as string).to.be.eq(url)
}

function expectMagekDatabase(
  magekDatabase: HealthIndicatorsResult | undefined,
  status: HealthStatus | string
): void {
  expectDefaultResult(magekDatabase, status, 'magek/database', 'Magek Database', 2)
  expect(magekDatabase!.details).to.not.be.undefined
}

function expectDatabaseEvents(
  databaseEvents: HealthIndicatorsResult | undefined,
  status: HealthStatus | string
): void {
  expectDefaultResult(databaseEvents, status, 'magek/database/events', 'Magek Database Events', 0)
  expect(databaseEvents!.details).to.be.undefined
}

function expectDatabaseEventsWithDetails(
  databaseEvents: HealthIndicatorsResult | undefined,
  status: HealthStatus | string,
  details: unknown
): void {
  expectDefaultResult(databaseEvents, status, 'magek/database/events', 'Magek Database Events', 0)
  expect(databaseEvents!.details).to.be.deep.eq(details)
}

function expectDatabaseReadModels(
  databaseReadModels: HealthIndicatorsResult | undefined,
  status: HealthStatus | string
): void {
  expectDefaultResult(
    databaseReadModels,
    status,
    'magek/database/readmodels',
    'Magek Database ReadModels',
    0
  )
  expect(databaseReadModels!.details).to.be.undefined
}

function expectDatabaseReadModelsWithDetails(
  databaseReadModels: HealthIndicatorsResult | undefined,
  status: HealthStatus | string,
  details: unknown
): void {
  expectDefaultResult(
    databaseReadModels,
    status,
    'magek/database/readmodels',
    'Magek Database ReadModels',
    0
  )
  expect(databaseReadModels!.details).to.be.deep.eq(details)
}

class UserRole {}
