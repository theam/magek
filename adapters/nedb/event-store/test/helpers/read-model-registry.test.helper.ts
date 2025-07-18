import { ReadModelEnvelope } from '@booster-ai/common'
import { expect } from '../expect'
import { faker } from '@faker-js/faker'
import { SinonStub } from 'sinon'

export type SinonSpy = SinonStub

export interface MockReadModel {
  id: string
  name: string
  age: number
  address: {
    street: string
    city: string
  }
  tags: string[]
  items: Array<{
    name: string
    price: number
  }>
}

export const expectedIdList = [faker.datatype.uuid(), faker.datatype.uuid()]

export function checkDatastoreCall(findSpy: SinonSpy, expectedFilter: any): void {
  expect(findSpy).to.have.been.calledOnceWith(expectedFilter)
}

export function checkSortByCall(sortSpy: SinonSpy, expectedSort: any): void {
  expect(sortSpy).to.have.been.calledOnceWith(expectedSort)
}

export function assertOrderByNameAsc(readModels: any): void {
  const sortSpy = readModels.find().sort as SinonSpy
  checkSortByCall(sortSpy, { 'value.name': 1 })
}

export function assertOrderByAgeDesc(readModels: any): void {
  const sortSpy = readModels.find().sort as SinonSpy
  checkSortByCall(sortSpy, { 'value.age': -1 })
}

export function assertOrderByAgeAndIdDesc(readModels: any): void {
  const sortSpy = readModels.find().sort as SinonSpy
  checkSortByCall(sortSpy, { 'value.age': -1, 'value.id': 1 })
}

export function assertOrderByIdAsc(readModels: any): void {
  const sortSpy = readModels.find().sort as SinonSpy
  checkSortByCall(sortSpy, { 'value.cart.id': 1 })
}

export async function insertTestReadModels(readModelRegistry: any): Promise<void> {
  const mockReadModels: ReadModelEnvelope[] = [
    {
      typeName: 'MockReadModel',
      value: {
        id: expectedIdList[0],
        name: 'TestName1',
        age: 25,
        address: {
          street: 'Street1',
          city: 'City1',
        },
        tags: ['tag1', 'tag2'],
        items: [
          { name: 'Item1', price: 10.0 },
          { name: 'Item2', price: 20.0 },
        ],
      },
    },
    {
      typeName: 'MockReadModel',
      value: {
        id: expectedIdList[1],
        name: 'TestName2',
        age: 30,
        address: {
          street: 'Street2',
          city: 'City2',
        },
        tags: ['tag3', 'tag4'],
        items: [
          { name: 'Item3', price: 30.0 },
          { name: 'Item4', price: 40.0 },
        ],
      },
    },
  ]

  // Override the execAsync to return our mock data
  readModelRegistry.readModels.find.returns({
    sort: () => ({
      skip: () => ({
        limit: () => ({
          execAsync: () => Promise.resolve(mockReadModels),
        }),
      }),
    }),
  })
}

export function expectReadModelsToContain(result: ReadModelEnvelope[], expected: any[]): void {
  expect(result).to.have.length(expected.length)
  result.forEach((readModel, index) => {
    expect(readModel.value).to.deep.include(expected[index])
  })
}