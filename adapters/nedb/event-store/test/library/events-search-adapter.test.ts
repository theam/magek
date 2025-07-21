import { MagekConfig } from '@magek/common'
import { createStubInstance, replace, restore, SinonStub, SinonStubbedInstance, stub } from 'sinon'
import { searchEntitiesIds } from '../../src/library/events-search-adapter'
import { expect } from '../expect'
import { EventRegistry } from '../../src/event-registry'

describe('The "searchEntitiesIDs" method', () => {
  let mockConfig: MagekConfig
  let queryStub: SinonStub
  type StubbedClass<T> = SinonStubbedInstance<T> & T
  let mockEventRegistry: SinonStubbedInstance<EventRegistry>

  beforeEach(() => {
    mockConfig = new MagekConfig('test')
    queryStub = stub()

    mockEventRegistry = createStubInstance(EventRegistry) as StubbedClass<EventRegistry>
     
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
