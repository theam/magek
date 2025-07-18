import { BoosterConfig } from '@booster-ai/common'
import { createStubInstance, replace, restore, SinonStub, SinonStubbedInstance, stub } from 'sinon'
import { searchEntitiesIds } from '../../src/library/events-search-adapter'
import { expect } from '../expect'
import { WebSocketRegistry } from '@magek/adapter-event-store-nedb'

describe('The "searchEntitiesIDs" method', () => {
  let mockConfig: BoosterConfig
  let queryStub: SinonStub
  type StubbedClass<T> = SinonStubbedInstance<T> & T
  let mockEventRegistry: SinonStubbedInstance<WebSocketRegistry>

  beforeEach(() => {
    mockConfig = new BoosterConfig('test')
    queryStub = stub()

    mockEventRegistry = createStubInstance(WebSocketRegistry) as StubbedClass<WebSocketRegistry>
     
    replace(mockEventRegistry, 'query', queryStub as any)
  })

  afterEach(() => {
    restore()
  })

  it('Generate query for entityTypeName, limit and afterCursor has all fields', async () => {
    const limit = 1
    const afterCursor = { id: '1' }
    const entityTypeName = 'entity'
    await searchEntitiesIds(mockEventRegistry as any, mockConfig, limit, afterCursor, entityTypeName)

    expect(queryStub).to.have.been.calledWithExactly(
      { kind: 'event', entityTypeName: 'entity', deletedAt: { $exists: false } },
      -1,
      undefined,
      {
        entityID: 1,
      }
    )
  })

  it('Generate query for entityTypeName, limit has all fields', async () => {
    const limit = 1
    const entityTypeName = 'entity'
    await searchEntitiesIds(mockEventRegistry as any, mockConfig, limit, undefined, entityTypeName)

    expect(queryStub).to.have.been.calledWithExactly(
      { kind: 'event', entityTypeName: 'entity', deletedAt: { $exists: false } },
      -1,
      undefined,
      {
        entityID: 1,
      }
    )
  })
})
