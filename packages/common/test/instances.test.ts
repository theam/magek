 
import { createInstanceWithCalculatedProperties, evolve, ProjectionFor, ReadModelInterface, UUID } from '../src'
import { expect } from './helpers/expect'
import { faker } from '@faker-js/faker'

describe('the `Instances` helper', () => {
  class PersonReadModel implements ReadModelInterface {
    public constructor(
      readonly id: UUID,
      readonly firstName: string,
      readonly lastName: string,
      readonly friends: Array<PersonReadModel>
    ) {}

    public get fullName(): Promise<string> {
      return Promise.resolve(`${this.firstName} ${this.lastName}`)
    }
  }

  let rawObject: any

  beforeEach(() => {
    rawObject = {
      id: faker.string.uuid(),
      firstName: faker.lorem.word(),
      lastName: faker.lorem.word(),
      friends: [
        { id: faker.string.uuid(), firstName: faker.lorem.word(), lastName: faker.lorem.word() },
        { id: faker.string.uuid(), firstName: faker.lorem.word(), lastName: faker.lorem.word() },
      ],
    }
  })

  describe('the createInstanceWithCalculatedProperties method', () => {
    it('creates an instance of the read model class with the calculated properties included', async () => {
      const propertiesToInclude = ['id', 'fullName'] as ProjectionFor<PersonReadModel>

      const instance = await createInstanceWithCalculatedProperties(PersonReadModel, rawObject, propertiesToInclude)

      expect(instance).to.deep.equal({
        id: rawObject.id,
        fullName: `${rawObject.firstName} ${rawObject.lastName}`,
      })
    })

    it('correctly supports arrays and nested objects in `propertiesToInclude`', async () => {
      const propertiesToInclude = ['id', 'fullName', 'friends[].id'] as ProjectionFor<PersonReadModel>

      const instance = await createInstanceWithCalculatedProperties(PersonReadModel, rawObject, propertiesToInclude)

      expect(instance).to.deep.equal({
        id: rawObject.id,
        fullName: `${rawObject.firstName} ${rawObject.lastName}`,
        friends: [{ id: rawObject.friends[0].id }, { id: rawObject.friends[1].id }],
      })
    })
  })

  describe('the evolve method', () => {
    it('merges changes into the current entity', () => {
      const current = { id: faker.string.uuid(), name: faker.lorem.word(), count: 1 }

      const evolved = evolve(current, { count: current.count + 1 })

      expect(evolved).to.deep.equal({ ...current, count: 2 })
    })

    it('applies defaults when creating a new entity', () => {
      const id = faker.string.uuid()

      const evolved = evolve(undefined, { id }, { status: 'active', name: faker.lorem.word() })

      expect(evolved).to.include({ id, status: 'active' })
    })
  })
})
