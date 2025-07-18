import { WebSocketRegistry, ConnectionData } from '../../src/web-socket-registry'
import { faker } from '@faker-js/faker'
import { expect } from '../expect'
import { restore, stub } from 'sinon'

describe('WebSocketRegistry', (): void => {
  let webSocketRegistry: WebSocketRegistry
  let mockDatabaseFile: string

  beforeEach((): void => {
    mockDatabaseFile = faker.system.fileName()
    webSocketRegistry = new WebSocketRegistry(mockDatabaseFile)
    webSocketRegistry.datastore = {
      filename: mockDatabaseFile,
      loadDatabaseAsync: stub().resolves(),
      ensureIndexAsync: stub().resolves(),
      insertAsync: stub().resolves(),
      removeAsync: stub().resolves(1),
      countAsync: stub().resolves(5),
      findAsync: stub().returns({
        sort: stub().returns({
          limit: stub().returns({
            execAsync: stub().resolves([]),
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
      it('should load the database and add indexes', async (): Promise<void> => {
        expect(webSocketRegistry.isLoaded).to.be.false
        await webSocketRegistry.loadDatabaseIfNeeded()
        expect(webSocketRegistry.isLoaded).to.be.true
        expect(webSocketRegistry.datastore.loadDatabaseAsync).to.have.been.calledOnce
        expect(webSocketRegistry.datastore.ensureIndexAsync).to.have.been.calledOnce
      })
    })

    describe('with database already loaded', (): void => {
      it('should not load the database twice', async (): Promise<void> => {
        webSocketRegistry.isLoaded = true
        await webSocketRegistry.loadDatabaseIfNeeded()
        expect(webSocketRegistry.datastore.loadDatabaseAsync).not.to.have.been.called
      })
    })
  })

  describe('the "store" method', (): void => {
    it('should store a connection data envelope', async (): Promise<void> => {
      const mockConnectionData: ConnectionData = {
        connectionID: faker.datatype.uuid(),
        expirationTime: Date.now() + 3600000, // 1 hour from now
      }

      await webSocketRegistry.store(mockConnectionData)
      expect(webSocketRegistry.datastore.insertAsync).to.have.been.calledOnceWith(mockConnectionData)
    })
  })

  describe('the "query" method', (): void => {
    it('should query the datastore correctly', async (): Promise<void> => {
      const expectedQuery = { connectionID: faker.datatype.uuid() }
      await webSocketRegistry.query(expectedQuery)
      
      expect(webSocketRegistry.datastore.findAsync).to.have.been.calledOnceWith(expectedQuery, undefined)
    })

    it('should apply limit when provided', async (): Promise<void> => {
      const expectedQuery = { connectionID: faker.datatype.uuid() }
      const expectedLimit = 10
      
      await webSocketRegistry.query(expectedQuery, 1, expectedLimit)
      
      const cursor = webSocketRegistry.datastore.findAsync()
      expect(cursor.sort().limit).to.have.been.calledOnceWith(expectedLimit)
    })
  })

  describe('the "delete" method', (): void => {
    it('should delete records matching the query', async (): Promise<void> => {
      const expectedQuery = { connectionID: faker.datatype.uuid() }
      const result = await webSocketRegistry.delete(expectedQuery)
      
      expect(webSocketRegistry.datastore.removeAsync).to.have.been.calledOnceWith(expectedQuery, { multi: true })
      expect(result).to.equal(1)
    })
  })

  describe('the "deleteAll" method', (): void => {
    it('should delete all records', async (): Promise<void> => {
      const result = await webSocketRegistry.deleteAll()
      
      expect(webSocketRegistry.datastore.removeAsync).to.have.been.calledOnceWith({}, { multi: true })
      expect(result).to.equal(1)
    })
  })

  describe('the "count" method', (): void => {
    it('should count records matching the query', async (): Promise<void> => {
      const expectedQuery = { connectionID: faker.datatype.uuid() }
      const result = await webSocketRegistry.count(expectedQuery)
      
      expect(webSocketRegistry.datastore.countAsync).to.have.been.calledOnceWith(expectedQuery)
      expect(result).to.equal(5)
    })

    it('should count all records when no query provided', async (): Promise<void> => {
      const result = await webSocketRegistry.count()
      
      expect(webSocketRegistry.datastore.countAsync).to.have.been.calledOnceWith(undefined)
      expect(result).to.equal(5)
    })
  })
})