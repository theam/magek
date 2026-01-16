import { Runtime, EventSearchRequest, EventSearchResponse, UUID } from '@magek/common'
import { restore, fake, SinonSpy, match } from 'sinon'
import { faker } from '@faker-js/faker'
import { MagekEventsReader } from '../src/events-reader'
import { expect } from './expect'
import { Magek } from '../src'
import { MagekAuthorizer } from '../src/authorizer'
import { createMockEventStoreAdapter } from './helpers/event-store-adapter-helper'

describe('MagekEventsReader', () => {
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

  let eventsReader: MagekEventsReader
  let providerEventsSearch: SinonSpy
  const searchResult: EventSearchResponse[] = [
    {
      requestID: faker.string.uuid(),
      type: TestEvent.name,
      entity: faker.lorem.word(),
      entityID: faker.string.uuid(),
      createdAt: faker.date.recent().toISOString(),
      value: {
        entityID: () => UUID.generate(),
      },
    },
  ]

  beforeEach(() => {
    const eventStreamAuthorizer = MagekAuthorizer.authorizeRoles.bind(null, [CanReadEventsRole])
    Magek.configureCurrentEnv((config) => {
      providerEventsSearch = fake.returns(searchResult)

      config.runtime = {} as Runtime
      config.eventStoreAdapter = createMockEventStoreAdapter({
        search: providerEventsSearch,
      })

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
      eventsReader = new MagekEventsReader(config)
    })
  })

  afterEach(() => {
    restore()
  })

  describe('the validation for the method `fetch` throws the right error when', () => {
    it('is a "byEntity" search and entity metadata is not found', async () => {
      const request: EventSearchRequest = {
        requestID: faker.string.uuid(),
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
        requestID: faker.string.uuid(),
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
        requestID: faker.string.uuid(),
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
        requestID: faker.string.uuid(),
        parameters: {} as never,
      }
      await expect(eventsReader.fetch(request)).to.be.rejectedWith(/Invalid event search request/)
    })

    it('is an invalid type of event search: it is both a "byEntity" and a "byType" search', async () => {
      const request: EventSearchRequest = {
        requestID: faker.string.uuid(),
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
        requestID: faker.string.uuid(),
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
        requestID: faker.string.uuid(),
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
