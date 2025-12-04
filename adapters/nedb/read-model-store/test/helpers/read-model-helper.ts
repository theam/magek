import { ReadModelEnvelope, ReadModelInterface } from '@magek/common'
import { faker } from '@faker-js/faker'
import { expect } from '../expect'

export function createMockReadModelEnvelope(partialValue?: Partial<ReadModelInterface>): ReadModelEnvelope {
  return {
    value: {
      id: faker.string.uuid(),
      age: faker.number.int({ max: 40 }),
      foo: faker.lorem.word(),
      bar: faker.number.float(),
      magekMetadata: {
        version: 1,
        schemaVersion: 1,
      },
      arr: [
        {
          id: faker.string.uuid(),
          name: faker.lorem.word(),
        },
        {
          id: faker.string.uuid(),
          name: faker.lorem.word(),
        },
      ],
      prop: {
        items: [
          {
            id: faker.string.uuid(),
            name: faker.lorem.word(),
          },
          {
            id: faker.string.uuid(),
            name: faker.lorem.word(),
          },
        ],
      },
      ...partialValue,
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