import { ProviderLibrary, EventSearchRequest, EventSearchResponse, UUID } from '@booster-ai/common'
import { restore, fake, SinonSpy, match } from 'sinon'
import { faker } from '@faker-js/faker'
import { BoosterEventsReader } from '../src/booster-events-reader.js'
import { expect } from './expect.js'
import { Booster } from '../src.js'
import { BoosterAuthorizer } from '../src/booster-authorizer.js'

describe('BoosterEventsReader', () => {
  class TestEntity {
    public id = 'testID'
  }
  class NonRegisteredTestEntity {
    public id = 'testID'
  }
  class TestEvent {
    public id = 'testId'
    public entityID(): UUID {
      return this.id
    }
    public getPrefixedId(prefix: string): string {
      return `${prefix}-${this.id}`
    }
  }
  class TestEventReducedByNonRegisteredEntity {}
  class CanReadEventsRole {}

  let eventsReader: BoosterEventsReader
  let providerEventsSearch: SinonSpy
  const searchResult: EventSearchResponse[] = [
    {
      requestID: faker.datatype.uuid(),
      type: TestEvent.name,
      entity: faker.lorem.word(),
      entityID: faker.datatype.uuid(),
      createdAt: faker.date.recent().toISOString(),
      value: {
        entityID: () => UUID.generate(),
      },
    },
  ]

  beforeEach(() => {
    const eventStreamAuthorizer = BoosterAuthorizer.authorizeRoles.bind(null, [CanReadEventsRole])
    Booster.configureCurrentEnv((config) => {
      providerEventsSearch = fake.returns(searchResult)

      config.provider = {
        events: {
          search: providerEventsSearch,
        },
      } as unknown as ProviderLibrary

      config.entities[TestEntity.name] = {
        class: TestEntity,
        eventStreamAuthorizer,
      }
      config.reducers[TestEvent.name] = {
        class: TestEntity,
        methodName: 'testReducerMethod',
      }
      config.reducers[TestEventReducedByNonRegisteredEntity.name] = {
        class: NonRegisteredTestEntity,
        methodName: 'testReducerMethod',
      }
      config.events[TestEvent.name] = { class: TestEvent }
      eventsReader = new BoosterEventsReader(config)
    })
  })

  afterEach(() => {
    restore()
  })

  describe('the validation for the method `fetch` throws the right error when', () => {
    it('is a "byEntity" search and entity metadata is not found', async () => {
      const request: EventSearchRequest = {
        requestID: faker.datatype.uuid(),
        parameters: {
          entity: 'NonExistingEntity',
        },
      }
      await expect(eventsReader.fetch(request)).to.be.rejectedWith(
        /Could not find entity metadata for "NonExistingEntity"/
      )
    })

    it('is a "byType" search and the associated entity is not found', async () => {
      const request: EventSearchRequest = {
        requestID: faker.datatype.uuid(),
        parameters: {
          type: 'NonExistingEventType',
        },
      }
      await expect(eventsReader.fetch(request)).to.be.rejectedWith(
        /Could not find the entity associated to event type "NonExistingEventType"/
      )
    })

    it('is a "byEvent" search and the associated entity metadata is not found', async () => {
      const request: EventSearchRequest = {
        requestID: faker.datatype.uuid(),
        parameters: {
          type: TestEventReducedByNonRegisteredEntity.name,
        },
      }
      await expect(eventsReader.fetch(request)).to.be.rejectedWith(
        /Could not find entity metadata for "NonRegisteredTestEntity"/
      )
    })

    it('is an invalid type of event search: it is not a "byEntity" or a "byType" search', async () => {
      const request: EventSearchRequest = {
        requestID: faker.datatype.uuid(),
        parameters: {} as never,
      }
      await expect(eventsReader.fetch(request)).to.be.rejectedWith(/Invalid event search request/)
    })

    it('is an invalid type of event search: it is both a "byEntity" and a "byType" search', async () => {
      const request: EventSearchRequest = {
        requestID: faker.datatype.uuid(),
        parameters: {
          entity: TestEntity.name,
          type: TestEvent.name,
        },
      }
      await expect(eventsReader.fetch(request)).to.be.rejectedWith(/Invalid event search request/)
    })

    it('user has no permissions', async () => {
      const request: EventSearchRequest = {
        currentUser: {
          roles: ['NonValidRole'],
          username: faker.internet.email(),
          claims: {},
        },
        requestID: faker.datatype.uuid(),
        parameters: {
          entity: TestEntity.name,
        },
      }
      await expect(eventsReader.fetch(request)).to.be.rejectedWith(/Access denied/)
    })
  })

  describe("The logic of 'fetch' method", () => {
    context('for a "byEntity" search', () => {
      const request: EventSearchRequest = {
        currentUser: {
          roles: [CanReadEventsRole.name],
          username: faker.internet.email(),
          claims: {},
        },
        requestID: faker.datatype.uuid(),
        parameters: {
          entity: TestEntity.name,
          from: 'fromTime',
          to: 'toTime',
        },
      }

      it('calls the provider search function with the right parameters and returns correctly', async () => {
        const result = await eventsReader.fetch(request)
        expect(providerEventsSearch).to.have.been.calledWith(match.any, request.parameters)
        expect(result).to.be.deep.equal(searchResult)
      })
    })
  })
})
