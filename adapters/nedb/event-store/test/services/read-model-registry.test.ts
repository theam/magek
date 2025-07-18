import { ReadModelEnvelope } from '@booster-ai/common'
import { expect } from '../expect'
import { faker } from '@faker-js/faker'

import { restore, stub } from 'sinon'
import { ReadModelRegistry } from '../../src/read-model-registry'
import {
  assertOrderByAgeAndIdDesc,
  assertOrderByAgeDesc,
  assertOrderByIdAsc,
  assertOrderByNameAsc,
  checkDatastoreCall,
  insertTestReadModels,
  expectReadModelsToContain,
  expectedIdList,
  SinonSpy,
} from '../helpers/read-model-registry.test.helper'

describe('ReadModelRegistry', (): void => {
  let readModelRegistry: ReadModelRegistry
  let mockDatabaseFile: string

  beforeEach(async (): Promise<void> => {
    mockDatabaseFile = faker.system.fileName()
    readModelRegistry = new ReadModelRegistry()
    // @ts-ignore - We're mocking the readModels property
    readModelRegistry.readModels = {
      filename: mockDatabaseFile,
      loadDatabaseAsync: stub().resolves(),
      ensureIndexAsync: stub().resolves(),
      insertAsync: stub().resolves(),
      updateAsync: stub().resolves({ numAffected: 1 }),
      removeAsync: stub().resolves(1),
      find: stub().returns({
        sort: stub().returns({
          skip: stub().returns({
            limit: stub().returns({
              execAsync: stub().resolves([]),
            }),
          }),
        }),
      }),
    } as any
  })

  afterEach((): void => {
    restore()
  })

  describe('the "loadDatabaseIfNeeded" method', (): void => {
    describe('with database not loaded', (): void => {
      it('should load the database', async (): Promise<void> => {
        expect(readModelRegistry.isLoaded).to.be.false
        await readModelRegistry.loadDatabaseIfNeeded()
        expect(readModelRegistry.isLoaded).to.be.true
      })
    })

    describe('with database already loaded', (): void => {
      it('should not load the database twice', async (): Promise<void> => {
        readModelRegistry.isLoaded = true
        const loadDatabaseAsyncSpy = readModelRegistry.readModels.loadDatabaseAsync as SinonSpy
        await readModelRegistry.loadDatabaseIfNeeded()
        expect(loadDatabaseAsyncSpy).not.to.have.been.called
      })
    })
  })

  describe('the "query" method', (): void => {
    it('should call the datastore correctly', async (): Promise<void> => {
      const expectedFilter = { id: faker.datatype.uuid() }
      await readModelRegistry.query(expectedFilter)
      checkDatastoreCall(readModelRegistry.readModels.find as SinonSpy, expectedFilter)
    })

    it('should call sort method with no sortBy object', async (): Promise<void> => {
      const expectedFilter = { id: faker.datatype.uuid() }
      const cursor = await readModelRegistry.query(expectedFilter)
      // Check that sort was called with undefined
      expect(cursor).to.be.ok
    })

    it('should call sort method with sortBy object for one field ASC', async (): Promise<void> => {
      const expectedFilter = { id: faker.datatype.uuid() }
      const sortBy = { name: 'ASC' as const }
      await readModelRegistry.query(expectedFilter, sortBy)
      assertOrderByNameAsc(readModelRegistry.readModels)
    })

    it('should call sort method with sortBy object for one field DESC', async (): Promise<void> => {
      const expectedFilter = { id: faker.datatype.uuid() }
      const sortBy = { age: 'DESC' as const }
      await readModelRegistry.query(expectedFilter, sortBy)
      assertOrderByAgeDesc(readModelRegistry.readModels)
    })

    it('should call sort method with sortBy object for two fields', async (): Promise<void> => {
      const expectedFilter = { id: faker.datatype.uuid() }
      const sortBy = { age: 'DESC' as const, id: 'ASC' as const }
      await readModelRegistry.query(expectedFilter, sortBy)
      assertOrderByAgeAndIdDesc(readModelRegistry.readModels)
    })

    it('should call sort method with sortBy object for nested object', async (): Promise<void> => {
      const expectedFilter = { id: faker.datatype.uuid() }
      const sortBy = { cart: { id: 'ASC' as const } }
      await readModelRegistry.query(expectedFilter, sortBy)
      assertOrderByIdAsc(readModelRegistry.readModels)
    })

    describe('with select', (): void => {
      beforeEach(async (): Promise<void> => {
        await insertTestReadModels(readModelRegistry)
      })

      it('should filter fields correctly for simple fields', async (): Promise<void> => {
        const select = ['id', 'name'] as any
        const result = await readModelRegistry.query({}, undefined, undefined, undefined, select)

        expectReadModelsToContain(result, [
          { id: expectedIdList[0], name: 'TestName1' },
          { id: expectedIdList[1], name: 'TestName2' },
        ])
      })

      it('should filter fields correctly for nested fields', async (): Promise<void> => {
        const select = ['id', 'address.city'] as any
        const result = await readModelRegistry.query({}, undefined, undefined, undefined, select)

        expectReadModelsToContain(result, [
          { id: expectedIdList[0], address: { city: 'City1' } },
          { id: expectedIdList[1], address: { city: 'City2' } },
        ])
      })

      it('should filter fields correctly for array fields', async (): Promise<void> => {
        const select = ['id', 'tags[]'] as any
        const result = await readModelRegistry.query({}, undefined, undefined, undefined, select)

        expectReadModelsToContain(result, [
          { id: expectedIdList[0], tags: ['tag1', 'tag2'] },
          { id: expectedIdList[1], tags: ['tag3', 'tag4'] },
        ])
      })

      it('should filter fields correctly for nested array fields', async (): Promise<void> => {
        const select = ['id', 'items[].name'] as any
        const result = await readModelRegistry.query({}, undefined, undefined, undefined, select)

        expectReadModelsToContain(result, [
          { id: expectedIdList[0], items: [{ name: 'Item1' }, { name: 'Item2' }] },
          { id: expectedIdList[1], items: [{ name: 'Item3' }, { name: 'Item4' }] },
        ])
      })
    })
  })

  describe('the "store" method', (): void => {
    let mockReadModelEnvelope: ReadModelEnvelope

    beforeEach((): void => {
      mockReadModelEnvelope = {
        typeName: 'TestReadModel',
        value: {
          id: faker.datatype.uuid(),
          boosterMetadata: {
            version: 1,
            schemaVersion: 1,
          },
        },
      }
    })

    describe('with version 1', (): void => {
      it('should insert the read model', async (): Promise<void> => {
        await readModelRegistry.store(mockReadModelEnvelope, 0)

        const insertAsyncSpy = readModelRegistry.readModels.insertAsync as SinonSpy
        expect(insertAsyncSpy).to.have.been.calledOnceWith(mockReadModelEnvelope)
      })
    })

    describe('with version > 1', (): void => {
      beforeEach((): void => {
        mockReadModelEnvelope.value.boosterMetadata!.version = 2
      })

      it('should update the read model', async (): Promise<void> => {
        await readModelRegistry.store(mockReadModelEnvelope, 1)

        const updateAsyncSpy = readModelRegistry.readModels.updateAsync as SinonSpy
        expect(updateAsyncSpy).to.have.been.calledOnceWith(
          {
            typeName: mockReadModelEnvelope.typeName,
            'value.id': mockReadModelEnvelope.value.id,
            'value.boosterMetadata.version': 1,
          },
          {
            ...mockReadModelEnvelope,
            uniqueKey: `TestReadModel_${mockReadModelEnvelope.value.id}_2`,
          },
          { upsert: false, returnUpdatedDocs: true }
        )
      })

      describe('when the update affects 0 records', (): void => {
        beforeEach((): void => {
          ;(readModelRegistry.readModels.updateAsync as SinonSpy).resolves({ numAffected: 0 })
        })

        it('should throw an optimistic concurrency error', async (): Promise<void> => {
          await expect(readModelRegistry.store(mockReadModelEnvelope, 1)).to.be.rejectedWith(
            `Can't update readModel ${JSON.stringify(mockReadModelEnvelope)} with expectedCurrentVersion = 1 . Optimistic concurrency error`
          )
        })
      })
    })
  })

  describe('the "deleteById" method', (): void => {
    it('should call the datastore correctly', async (): Promise<void> => {
      const expectedId = faker.datatype.uuid()
      const expectedTypeName = 'TestReadModel'
      await readModelRegistry.deleteById(expectedId, expectedTypeName)

      const removeAsyncSpy = readModelRegistry.readModels.removeAsync as SinonSpy
      expect(removeAsyncSpy).to.have.been.calledOnceWith(
        { typeName: expectedTypeName, 'value.id': expectedId },
        { multi: false }
      )
    })
  })
})