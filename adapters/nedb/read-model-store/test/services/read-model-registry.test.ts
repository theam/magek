 
import { ProjectionFor, ReadModelEnvelope } from '@magek/common'
import { expect } from '../expect'
import { faker } from '@faker-js/faker'

import { restore, stub } from 'sinon'
import { ReadModelRegistry } from '../../src/read-model-registry'
import {
  assertOrderByAgeAndIdDesc,
  assertOrderByAgeDesc,
  createMockReadModelEnvelope,
} from '../helpers/read-model-helper'

describe('the read model registry', () => {
  let initialReadModelsCount: number
  let mockReadModel: ReadModelEnvelope
  let readModelRegistry: ReadModelRegistry
  let mockDataStore: any
  let storedData: any[]

  beforeEach(async () => {
    initialReadModelsCount = faker.datatype.number({ min: 2, max: 10 })
    storedData = []
    
    // Create a mock DataStore that behaves like NeDB but stores data in memory
    mockDataStore = {
      loadDatabaseAsync: stub().resolves(),
      ensureIndexAsync: stub().resolves(),
      insertAsync: stub().callsFake((doc: any) => {
        const newDoc = { ...doc, _id: `id_${storedData.length}` }
        storedData.push(newDoc)
        return Promise.resolve(newDoc)
      }),
      find: stub().callsFake((query: any) => {
        const filtered = storedData.filter(doc => {
          return evaluateQuery(doc, query)
        })
        
        function evaluateQuery(doc: any, query: any): boolean {
          // Handle logical operators
          if ('$and' in query) {
            return query.$and.every((subQuery: any) => evaluateQuery(doc, subQuery))
          }
          if ('$or' in query) {
            return query.$or.some((subQuery: any) => evaluateQuery(doc, subQuery))
          }
          if ('$nor' in query) {
            return !query.$nor.some((subQuery: any) => evaluateQuery(doc, subQuery))
          }
          if ('$not' in query) {
            return !evaluateQuery(doc, query.$not)
          }
          
          return Object.keys(query).every(key => {
            const queryValue = query[key]
            
            // Handle MongoDB operators
            if (queryValue && typeof queryValue === 'object' && !Array.isArray(queryValue)) {
              if ('$exists' in queryValue) {
                // Handle nested field queries like 'value.other'
                if (key.includes('.')) {
                  const keys = key.split('.')
                  let value = doc
                  for (const k of keys) {
                    if (value && typeof value === 'object' && k in value) {
                      value = value[k]
                    } else {
                      value = undefined
                      break
                    }
                  }
                  return queryValue.$exists ? value !== undefined : value === undefined
                } else {
                  return queryValue.$exists ? key in doc : !(key in doc)
                }
              }
              
              // Handle comparison operators
              let actualValue
              if (key.includes('.')) {
                const keys = key.split('.')
                actualValue = doc
                for (const k of keys) {
                  if (actualValue && typeof actualValue === 'object' && k in actualValue) {
                    actualValue = actualValue[k]
                  } else {
                    actualValue = undefined
                    break
                  }
                }
              } else {
                actualValue = doc[key]
              }
              
              if (actualValue === undefined) return false
              
              if ('$lt' in queryValue) return actualValue < queryValue.$lt
              if ('$lte' in queryValue) return actualValue <= queryValue.$lte
              if ('$gt' in queryValue) return actualValue > queryValue.$gt
              if ('$gte' in queryValue) return actualValue >= queryValue.$gte
              if ('$ne' in queryValue) return actualValue !== queryValue.$ne
              if ('$in' in queryValue) return queryValue.$in.includes(actualValue)
              if ('$nin' in queryValue) return !queryValue.$nin.includes(actualValue)
              
              // Add more operators as needed
            }
            
            // Handle nested field queries like 'value.id'
            if (key.includes('.')) {
              const keys = key.split('.')
              let value = doc
              for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                  value = value[k]
                } else {
                  return false
                }
              }
              
              // Handle RegExp queries
              if (queryValue instanceof RegExp) {
                return typeof value === 'string' && queryValue.test(value)
              }
              
              return value === queryValue
            } else {
              // Handle RegExp queries
              if (queryValue instanceof RegExp) {
                return typeof doc[key] === 'string' && queryValue.test(doc[key])
              }
              
              return doc[key] === queryValue
            }
          })
        }
        
        // Return an object that has a sort method and an execAsync method
        const cursor = {
          sort: (sortOptions: any) => ({
            skip: (n: number) => ({
              limit: (l: number) => ({
                execAsync: () => {
                  const sorted = applySorting(filtered, sortOptions)
                  return Promise.resolve(sorted.slice(n, n + l))
                }
              }),
              execAsync: () => {
                const sorted = applySorting(filtered, sortOptions)
                return Promise.resolve(sorted.slice(n))
              }
            }),
            limit: (n: number) => ({
              execAsync: () => {
                const sorted = applySorting(filtered, sortOptions)
                return Promise.resolve(sorted.slice(0, n))
              }
            }),
            execAsync: () => {
              const sorted = applySorting(filtered, sortOptions)
              return Promise.resolve(sorted)
            }
          }),
          skip: (n: number) => ({
            limit: (l: number) => ({
              execAsync: () => Promise.resolve(filtered.slice(n, n + l))
            }),
            execAsync: () => Promise.resolve(filtered.slice(n))
          }),
          limit: (n: number) => ({
            execAsync: () => Promise.resolve(filtered.slice(0, n))
          }),
          execAsync: () => Promise.resolve(filtered)
        }
        return cursor
        
        function applySorting(data: any[], sortOptions: any): any[] {
          if (!sortOptions || Object.keys(sortOptions).length === 0) {
            return data
          }
          
          return [...data].sort((a, b) => {
            for (const [field, direction] of Object.entries(sortOptions)) {
              // Handle nested field access like 'value.age'
              let aValue = a
              let bValue = b
              
              if (field.includes('.')) {
                const keys = field.split('.')
                for (const key of keys) {
                  aValue = aValue?.[key]
                  bValue = bValue?.[key]
                }
              } else {
                aValue = a[field]
                bValue = b[field]
              }
              
              // Handle undefined values
              if (aValue === undefined && bValue === undefined) continue
              if (aValue === undefined) return 1
              if (bValue === undefined) return -1
              
              let comparison = 0
              if (aValue < bValue) comparison = -1
              else if (aValue > bValue) comparison = 1
              
              if (comparison !== 0) {
                // direction is 1 for ASC, -1 for DESC
                return direction === -1 ? -comparison : comparison
              }
            }
            return 0
          })
        }
      }),
      findAsync: stub().callsFake((query: any, projections?: any) => {
        let filtered = storedData.filter(doc => {
          return Object.keys(query).every(key => {
            // Handle nested field queries like 'value.id'
            if (key.includes('.')) {
              const keys = key.split('.')
              let value = doc
              for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                  value = value[k]
                } else {
                  return false
                }
              }
              return value === query[key]
            } else {
              return doc[key] === query[key]
            }
          })
        })
        
        // Apply projections if specified
        if (projections && typeof projections === 'object') {
          filtered = filtered.map(doc => {
            const projected: any = {}
            for (const key in projections) {
              if (projections[key] === 1 && doc.hasOwnProperty(key)) {
                projected[key] = doc[key]
              }
            }
            return projected
          })
        }
        
        // Return an object that has a sort method and an execAsync method
        const cursor = {
          sort: (sortOptions: any) => ({
            limit: (n: number) => ({
              execAsync: () => Promise.resolve(filtered.slice(0, n))
            }),
            execAsync: () => Promise.resolve(filtered)
          }),
          limit: (n: number) => ({
            execAsync: () => Promise.resolve(filtered.slice(0, n))
          }),
          execAsync: () => Promise.resolve(filtered)
        }
        return cursor
      }),
      removeAsync: stub().callsFake((query: any, options: any) => {
        const initialLength = storedData.length
        if (Object.keys(query).length === 0) {
          // Remove all
          storedData.splice(0, storedData.length)
        } else {
          // Remove matching documents
          for (let i = storedData.length - 1; i >= 0; i--) {
            const doc = storedData[i]
            const matches = Object.keys(query).every(key => doc[key] === query[key])
            if (matches) {
              storedData.splice(i, 1)
            }
          }
        }
        return Promise.resolve(initialLength - storedData.length)
      }),
      countAsync: stub().callsFake((query: any) => {
        if (!query || Object.keys(query).length === 0) {
          return Promise.resolve(storedData.length)
        }
        const filtered = storedData.filter(doc => {
          return Object.keys(query).every(key => doc[key] === query[key])
        })
        return Promise.resolve(filtered.length)
      }),
      updateAsync: stub().callsFake((query: any, update: any, options: any) => {
        let updatedCount = 0
        for (let i = 0; i < storedData.length; i++) {
          const doc = storedData[i]
          const matches = Object.keys(query).every(key => doc[key] === query[key])
          if (matches) {
            if (update.$set) {
              Object.assign(storedData[i], update.$set)
            }
            if (update.$inc) {
              for (const field in update.$inc) {
                storedData[i][field] = (storedData[i][field] || 0) + update.$inc[field]
              }
            }
            updatedCount++
            if (!options?.multi) break
          }
        }
        return Promise.resolve(updatedCount)
      })
    }
    
    readModelRegistry = new ReadModelRegistry()
    
    // Replace the internal datastore with our mock
    ;(readModelRegistry as any).readModels = mockDataStore
  })

  afterEach(() => {
    restore()
    storedData = []
  })

  describe('query', () => {
    beforeEach(async () => {
      const publishPromises: Array<Promise<any>> = []

      for (let i = 0; i < initialReadModelsCount; i++) {
        publishPromises.push(readModelRegistry.store(createMockReadModelEnvelope(), 0))
      }

      await Promise.all(publishPromises)

      mockReadModel = createMockReadModelEnvelope({ foo: `unique-${faker.datatype.uuid()}` })
      await readModelRegistry.store(mockReadModel, 1)
    })

    it('should return expected read model', async () => {
      const result = await readModelRegistry.query({
        value: mockReadModel.value,
        typeName: mockReadModel.typeName,
      })

      expect(result.length).to.be.equal(1)
      expect(result[0]).to.deep.include(mockReadModel)
    })

    it('should return expected read model by id', async () => {
      const result = await readModelRegistry.query({
        'value.id': mockReadModel.value.id,
        typeName: mockReadModel.typeName,
      })

      expect(result.length).to.be.equal(1)
      expect(result[0]).to.deep.include(mockReadModel)
    })

    it('should return expected read model when field does not exist', async () => {
      const result = await readModelRegistry.query({
        'value.id': mockReadModel.value.id,
        'value.other': { $exists: false },
        typeName: mockReadModel.typeName,
      })

      expect(result.length).to.be.equal(1)
      expect(result[0]).to.deep.include(mockReadModel)
    })

    it('should return no results when id do not match', async () => {
      const result = await readModelRegistry.query({
        'value.id': faker.datatype.uuid(),
        typeName: mockReadModel.typeName,
      })

      expect(result.length).to.be.equal(0)
    })

    it('should return no results when typeName do not match', async () => {
      const result = await readModelRegistry.query({
        'value.id': mockReadModel.value.id,
        typeName: faker.lorem.words(),
      })

      expect(result.length).to.be.equal(0)
    })

    it('should return no results when age is greater than max age', async () => {
      const result = await readModelRegistry.query({
        'value.age': { $gt: 40 },
      })

      expect(result.length).to.be.equal(0)
    })

    it('should return all results when age is less than or equal than max age', async () => {
      const result = await readModelRegistry.query({
        'value.age': { $lte: 40 },
      })

      expect(result.length).to.be.equal(initialReadModelsCount + 1)
    })

    it('should return all results sorted by Age', async () => {
      const result = await readModelRegistry.query(
        {},
        {
          age: 'DESC',
        }
      )

      expect(result.length).to.be.equal(initialReadModelsCount + 1)
      assertOrderByAgeDesc(result)
    })

    it('should return all results sorted by Age and ID', async () => {
      const result = await readModelRegistry.query(
        {},
        {
          age: 'DESC',
          id: 'DESC',
        }
      )

      expect(result.length).to.be.equal(initialReadModelsCount + 1)
      assertOrderByAgeAndIdDesc(result)
    })

    it('should return 1 result when age is less than or equal than max age', async () => {
      const result = await readModelRegistry.query({
        'value.age': { $lte: 40 },
        typeName: mockReadModel.typeName,
      })

      expect(result.length).to.be.equal(1)
    })

    it('should return some results when age is between a range with an and', async () => {
      const result = await readModelRegistry.query({
        $and: [{ 'value.age': { $lte: 40 } }, { 'value.age': { $gte: 1 } }],
      })

      expect(result.length).to.be.greaterThan(1)
      expect(result.length).to.be.lte(initialReadModelsCount + 1)
    })

    it('should return 1 result when you search with string', async () => {
      const result = await readModelRegistry.query({
        'value.foo': mockReadModel.value.foo,
        typeName: mockReadModel.typeName,
      })

      expect(result.length).to.be.equal(1)
      expect(result[0]).to.deep.include(mockReadModel)
    })

    it('should return 1 result when you search with a RegExp', async () => {
      const result = await readModelRegistry.query({
        'value.foo': new RegExp(mockReadModel.value.foo.substring(0, 4)),
        typeName: mockReadModel.typeName,
      })

      expect(result.length).to.be.equal(1)
      expect(result[0]).to.deep.include(mockReadModel)
    })

    it('should return n-1 results when you search with string and not operator', async () => {
      const result = await readModelRegistry.query({
        $not: { 'value.foo': mockReadModel.value.foo },
      })

      expect(result.length).to.be.equal(initialReadModelsCount)
      expect(result[0]).to.not.deep.include(mockReadModel)
    })

    it('should return only projected fields', async () => {
      const result = await readModelRegistry.query(
        {
          value: mockReadModel.value,
          typeName: mockReadModel.typeName,
        },
        undefined,
        undefined,
        undefined,
        ['id', 'age'] as ProjectionFor<unknown>
      )

      expect(result.length).to.be.equal(1)
      const expectedReadModel = {
        value: {
          id: mockReadModel.value.id,
          age: mockReadModel.value.age,
        },
      }
      expect(result[0]).to.deep.include(expectedReadModel)
    })

    it('should return only projected fields with array fields', async () => {
      const result = await readModelRegistry.query(
        {
          value: mockReadModel.value,
          typeName: mockReadModel.typeName,
        },
        undefined,
        undefined,
        undefined,
        ['id', 'age', 'arr[].id', 'prop.items[].name'] as ProjectionFor<unknown>
      )

      expect(result.length).to.be.equal(1)
      const expectedReadModel = {
        value: {
          id: mockReadModel.value.id,
          age: mockReadModel.value.age,
          arr: mockReadModel.value.arr.map((item: any) => ({ id: item.id })),
          prop: { items: mockReadModel.value.prop.items.map((item: any) => ({ name: item.name })) },
        },
      }
      expect(result[0]).to.deep.include(expectedReadModel)
    })

    it('should return only projected fields for complex read models', async () => {
      const complexReadModel: ReadModelEnvelope = {
        typeName: faker.lorem.word(),
        value: {
          id: faker.datatype.uuid(),
          x: {
            arr: [{ y: faker.lorem.word(), z: faker.datatype.number() }],
          },
          foo: {
            bar: {
              items: [{ id: faker.datatype.uuid(), name: faker.lorem.word() }],
              baz: { items: [{ id: faker.datatype.uuid(), name: faker.lorem.word() }] },
            },
          },
          arr: [
            {
              id: faker.datatype.uuid(),
              subArr: [{ id: faker.datatype.uuid(), name: faker.lorem.word() }],
            },
          ],
          magekMetadata: {
            version: 1,
            schemaVersion: 1,
          },
        },
      }

      await readModelRegistry.store(complexReadModel, 1)

      const result = await readModelRegistry.query(
        {
          value: complexReadModel.value,
          typeName: complexReadModel.typeName,
        },
        undefined,
        undefined,
        undefined,
        [
          'id',
          'x.arr[].z',
          'foo.bar.items[].id',
          'foo.bar.baz.items[].id',
          'arr[].subArr[].id',
          'arr[].id',
        ] as ProjectionFor<unknown>
      )

      expect(result.length).to.be.equal(1)
      const expectedReadModel = {
        value: {
          id: complexReadModel.value.id,
          x: {
            arr: complexReadModel.value.x.arr.map((item: any) => ({ z: item.z })),
          },
          foo: {
            bar: {
              items: complexReadModel.value.foo.bar.items.map((item: any) => ({ id: item.id })),
              baz: { items: complexReadModel.value.foo.bar.baz.items.map((item: any) => ({ id: item.id })) },
            },
          },
          arr: complexReadModel.value.arr.map((item: any) => {
            return { id: item.id, subArr: item.subArr.map((subItem: any) => ({ id: subItem.id })) }
          }),
        },
      }
      expect(result[0]).to.deep.include(expectedReadModel)
    })
  })

  describe('delete by id', () => {
    it('should delete read models by id', async () => {
      const mockReadModelEnvelope: ReadModelEnvelope = createMockReadModelEnvelope()
      const id = '1'
      mockReadModelEnvelope.value.id = id

      readModelRegistry.readModels.removeAsync = stub().returns(mockReadModelEnvelope)

      await readModelRegistry.store(mockReadModelEnvelope, 1)
      await readModelRegistry.deleteById(id, mockReadModelEnvelope.typeName)

      expect(readModelRegistry.readModels.removeAsync).to.have.been.calledWith(
        { typeName: mockReadModelEnvelope.typeName, 'value.id': id },
        { multi: false }
      )
    })
  })

  describe('the store method', () => {
    it('should upsert read models into the read models database', async () => {
      const readModel: ReadModelEnvelope = createMockReadModelEnvelope()
      readModel.value.magekMetadata!.version = 2
      const expectedQuery = {
        typeName: readModel.typeName,
        'value.id': readModel.value.id,
        'value.magekMetadata.version': 2,
      }

      readModelRegistry.readModels.updateAsync = stub().returns(readModel)

      await readModelRegistry.store(readModel, 2)
      expect(readModelRegistry.readModels.updateAsync).to.have.been.calledWith(expectedQuery, readModel, {
        upsert: false,
        returnUpdatedDocs: true,
      })
    })

    it('should throw if the database `insert` fails', async () => {
      const readModel: ReadModelEnvelope = {
        value: {
          id: faker.datatype.uuid(),
        },
        typeName: faker.lorem.word(),
      }

      const error = new Error(faker.lorem.words())

      readModelRegistry.readModels.update = stub().yields(error, null)

      void expect(readModelRegistry.store(readModel, 1)).to.be.rejectedWith(error)
    })
  })
})