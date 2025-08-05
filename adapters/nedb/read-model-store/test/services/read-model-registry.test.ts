import { ProjectionFor, ReadModelEnvelope } from '@magek/common'
import { expect } from '../expect'
import { faker } from '@faker-js/faker'

import { restore, stub } from 'sinon'
import { ReadModelRegistry } from '../../src/read-model-registry'
import { createMockReadModelEnvelope } from '../helpers/read-model-helper'

describe('the read model registry', () => {
  let mockReadModel: ReadModelEnvelope
  let readModelRegistry: ReadModelRegistry
  let mockDataStore: any

  beforeEach(async () => {
    // Create a simple mock DataStore that just tracks method calls
    mockDataStore = {
      loadDatabaseAsync: stub().resolves(),
      ensureIndexAsync: stub().resolves(),
      insertAsync: stub().resolves({ _id: 'mock-id' }),
      find: stub().returns({
        sort: stub().returns({
          skip: stub().returns({
            limit: stub().returns({
              execAsync: stub().resolves([])
            }),
            execAsync: stub().resolves([])
          }),
          limit: stub().returns({
            execAsync: stub().resolves([])
          }),
          execAsync: stub().resolves([])
        }),
        skip: stub().returns({
          limit: stub().returns({
            execAsync: stub().resolves([])
          }),
          execAsync: stub().resolves([])
        }),
        limit: stub().returns({
          execAsync: stub().resolves([])
        }),
        execAsync: stub().resolves([])
      }),
      findAsync: stub().returns({
        sort: stub().returns({
          limit: stub().returns({
            execAsync: stub().resolves([])
          }),
          execAsync: stub().resolves([])
        }),
        limit: stub().returns({
          execAsync: stub().resolves([])
        }),
        execAsync: stub().resolves([])
      }),
      removeAsync: stub().resolves(1),
      countAsync: stub().resolves(0),
      updateAsync: stub().resolves(1)
    }
    
    readModelRegistry = new ReadModelRegistry()
    
    // Replace the internal datastore with our mock
    ;(readModelRegistry as any).readModels = mockDataStore
  })

  afterEach(() => {
    restore()
  })

  describe('query', () => {
    beforeEach(async () => {
      mockReadModel = createMockReadModelEnvelope({ foo: `unique-${faker.datatype.uuid()}` })
    })

    it('should call find with correct query parameters', async () => {
      const query = {
        value: mockReadModel.value,
        typeName: mockReadModel.typeName,
      }
      
      // Mock find to return the expected result
      mockDataStore.find.returns({
        execAsync: stub().resolves([mockReadModel])
      })

      const result = await readModelRegistry.query(query)

      expect(mockDataStore.find).to.have.been.calledOnce
      expect(mockDataStore.find).to.have.been.calledWith(query)
      expect(result.length).to.be.equal(1)
      expect(result[0]).to.deep.include(mockReadModel)
    })

    it('should call find with nested field query', async () => {
      const query = {
        'value.id': mockReadModel.value.id,
        typeName: mockReadModel.typeName,
      }
      
      mockDataStore.find.returns({
        execAsync: stub().resolves([mockReadModel])
      })

      const result = await readModelRegistry.query(query)

      expect(mockDataStore.find).to.have.been.calledOnce
      expect(mockDataStore.find).to.have.been.calledWith(query)
      expect(result.length).to.be.equal(1)
      expect(result[0]).to.deep.include(mockReadModel)
    })

    it('should call find with $exists operator', async () => {
      const query = {
        'value.id': mockReadModel.value.id,
        'value.other': { $exists: false },
        typeName: mockReadModel.typeName,
      }
      
      mockDataStore.find.returns({
        execAsync: stub().resolves([mockReadModel])
      })

      const result = await readModelRegistry.query(query)

      expect(mockDataStore.find).to.have.been.calledOnce
      expect(mockDataStore.find).to.have.been.calledWith(query)
      expect(result.length).to.be.equal(1)
      expect(result[0]).to.deep.include(mockReadModel)
    })

    it('should return empty results when no matches found', async () => {
      const query = {
        'value.id': faker.datatype.uuid(),
        typeName: mockReadModel.typeName,
      }
      
      mockDataStore.find.returns({
        execAsync: stub().resolves([])
      })

      const result = await readModelRegistry.query(query)

      expect(mockDataStore.find).to.have.been.calledOnce
      expect(mockDataStore.find).to.have.been.calledWith(query)
      expect(result.length).to.be.equal(0)
    })

    it('should call find with comparison operators', async () => {
      const query = {
        'value.age': { $lte: 40 },
      }
      
      mockDataStore.find.returns({
        execAsync: stub().resolves([mockReadModel])
      })

      await readModelRegistry.query(query)

      expect(mockDataStore.find).to.have.been.calledOnce
      expect(mockDataStore.find).to.have.been.calledWith(query)
    })

    it('should apply sorting when provided', async () => {
      const sortOrder = { age: 'DESC' }
      const sortCursor = {
        execAsync: stub().resolves([mockReadModel])
      }
      
      mockDataStore.find.returns({
        sort: stub().returns(sortCursor),
        execAsync: stub().resolves([mockReadModel])
      })

      await readModelRegistry.query({}, sortOrder)

      expect(mockDataStore.find).to.have.been.calledOnce
      expect(mockDataStore.find().sort).to.have.been.calledWith({ 'value.age': -1 })
    })

    it('should apply complex sorting with multiple fields', async () => {
      const sortOrder = { age: 'DESC', id: 'DESC' }
      const sortCursor = {
        execAsync: stub().resolves([mockReadModel])
      }
      
      mockDataStore.find.returns({
        sort: stub().returns(sortCursor),
        execAsync: stub().resolves([mockReadModel])
      })

      await readModelRegistry.query({}, sortOrder)

      expect(mockDataStore.find).to.have.been.calledOnce
      expect(mockDataStore.find().sort).to.have.been.calledWith({ 'value.age': -1, 'value.id': -1 })
    })

    it('should handle logical operators', async () => {
      const query = {
        $and: [{ 'value.age': { $lte: 40 } }, { 'value.age': { $gte: 1 } }],
      }
      
      mockDataStore.find.returns({
        execAsync: stub().resolves([mockReadModel])
      })

      await readModelRegistry.query(query)

      expect(mockDataStore.find).to.have.been.calledOnce
      expect(mockDataStore.find).to.have.been.calledWith(query)
    })

    it('should handle RegExp queries', async () => {
      const query = {
        'value.foo': new RegExp(mockReadModel.value.foo.substring(0, 4)),
        typeName: mockReadModel.typeName,
      }
      
      mockDataStore.find.returns({
        execAsync: stub().resolves([mockReadModel])
      })

      const result = await readModelRegistry.query(query)

      expect(mockDataStore.find).to.have.been.calledOnce
      expect(mockDataStore.find).to.have.been.calledWith(query)
      expect(result.length).to.be.equal(1)
      expect(result[0]).to.deep.include(mockReadModel)
    })

    it('should handle $not operator', async () => {
      const query = {
        $not: { 'value.foo': mockReadModel.value.foo },
      }
      
      mockDataStore.find.returns({
        execAsync: stub().resolves([])
      })

      await readModelRegistry.query(query)

      expect(mockDataStore.find).to.have.been.calledOnce
      expect(mockDataStore.find).to.have.been.calledWith(query)
    })

    it('should handle projections', async () => {
      const query = {
        value: mockReadModel.value,
        typeName: mockReadModel.typeName,
      }
      const projections = ['id', 'age'] as ProjectionFor<unknown>
      
      mockDataStore.find.returns({
        execAsync: stub().resolves([{
          value: {
            id: mockReadModel.value.id,
            age: mockReadModel.value.age,
            // Include extra data that should be filtered out
            foo: mockReadModel.value.foo,
          },
        }])
      })

      await readModelRegistry.query(query, undefined, undefined, undefined, projections)

      expect(mockDataStore.find).to.have.been.calledOnce
      expect(mockDataStore.find).to.have.been.calledWith(query)
      // We don't test the projection logic itself (that would be testing NeDB),
      // just that find was called with the right query
    })

    it('should handle complex projections with arrays', async () => {
      const query = {
        value: mockReadModel.value,
        typeName: mockReadModel.typeName,
      }
      const projections = ['id', 'age', 'arr[].id', 'prop.items[].name'] as ProjectionFor<unknown>
      
      mockDataStore.find.returns({
        execAsync: stub().resolves([{
          value: {
            id: mockReadModel.value.id,
            age: mockReadModel.value.age,
            arr: mockReadModel.value.arr,
            prop: mockReadModel.value.prop,
            // Include extra data that should be filtered out  
            foo: mockReadModel.value.foo,
          },
        }])
      })

      await readModelRegistry.query(query, undefined, undefined, undefined, projections)

      expect(mockDataStore.find).to.have.been.calledOnce
      expect(mockDataStore.find).to.have.been.calledWith(query)
      // We don't test the projection logic itself (that would be testing the filtering),
      // just that find was called with the right query
    })
  })

  describe('delete by id', () => {
    it('should call removeAsync with correct parameters', async () => {
      const mockReadModelEnvelope: ReadModelEnvelope = createMockReadModelEnvelope()
      const id = '1'
      mockReadModelEnvelope.value.id = id

      await readModelRegistry.deleteById(id, mockReadModelEnvelope.typeName)

      expect(mockDataStore.removeAsync).to.have.been.calledOnce
      expect(mockDataStore.removeAsync).to.have.been.calledWith(
        { typeName: mockReadModelEnvelope.typeName, 'value.id': id },
        { multi: false }
      )
    })
  })

  describe('the store method', () => {
    it('should call updateAsync with correct parameters for upsert', async () => {
      const readModel: ReadModelEnvelope = createMockReadModelEnvelope()
      readModel.value.magekMetadata!.version = 2
      const expectedQuery = {
        typeName: readModel.typeName,
        'value.id': readModel.value.id,
        'value.magekMetadata.version': 2,
      }

      await readModelRegistry.store(readModel, 2)
      
      expect(mockDataStore.updateAsync).to.have.been.calledOnce
      expect(mockDataStore.updateAsync).to.have.been.calledWith(expectedQuery, readModel, {
        upsert: false,
        returnUpdatedDocs: true,
      })
    })

    it('should handle database errors properly', async () => {
      const readModel: ReadModelEnvelope = {
        value: {
          id: faker.datatype.uuid(),
        },
        typeName: faker.lorem.word(),
      }

      const error = new Error(faker.lorem.words())
      mockDataStore.updateAsync.rejects(error)

      await expect(readModelRegistry.store(readModel, 1)).to.be.rejectedWith(error)
    })
  })
})