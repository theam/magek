 
import { createInstanceWithCalculatedProperties, ProjectionFor, ReadModelInterface, UUID } from '../src.js'
import { expect } from './helpers/expect.js'
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
      id: faker.datatype.uuid(),
      firstName: faker.lorem.word(),
      lastName: faker.lorem.word(),
      friends: [
        { id: faker.datatype.uuid(), firstName: faker.lorem.word(), lastName: faker.lorem.word() },
        { id: faker.datatype.uuid(), firstName: faker.lorem.word(), lastName: faker.lorem.word() },
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
})
