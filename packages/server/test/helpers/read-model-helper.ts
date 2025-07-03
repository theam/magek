import { ReadModelEnvelope } from '@booster-ai/common'
import { faker } from '@faker-js/faker'
import { expect } from '../expect.js'

export function createMockReadModelEnvelope(): ReadModelEnvelope {
  return {
    value: {
      id: faker.datatype.uuid(),
      age: faker.datatype.number(40),
      foo: faker.lorem.word(),
      bar: faker.datatype.float(),
      boosterMetadata: {
        version: 1,
        schemaVersion: 1,
      },
      arr: [
        {
          id: faker.datatype.uuid(),
          name: faker.lorem.word(),
        },
        {
          id: faker.datatype.uuid(),
          name: faker.lorem.word(),
        },
      ],
      prop: {
        items: [
          {
            id: faker.datatype.uuid(),
            name: faker.lorem.word(),
          },
          {
            id: faker.datatype.uuid(),
            name: faker.lorem.word(),
          },
        ],
      },
    },
    typeName: faker.lorem.word(),
  }
}

export function assertOrderByAgeDesc(result: Array<ReadModelEnvelope>): void {
  const readModelEnvelopes = [...result] as Array<ReadModelEnvelope>
  const expectedResult = readModelEnvelopes.sort(function (a: ReadModelEnvelope, b: ReadModelEnvelope) {
    return a.value.age > b.value.age ? -1 : 1
  })

  expect(result).to.eql(expectedResult)
}

export function assertOrderByAgeAndIdDesc(result: Array<ReadModelEnvelope>): void {
  const readModelEnvelopes = [...result] as Array<ReadModelEnvelope>
  const expectedResult = readModelEnvelopes.sort(function (a: ReadModelEnvelope, b: ReadModelEnvelope) {
    if (a.value.age === b.value.age) {
      return a.value.id > b.value.id ? -1 : 1
    }
    return a.value.age > b.value.age ? -1 : 1
  })

  expect(result).to.eql(expectedResult)
}
