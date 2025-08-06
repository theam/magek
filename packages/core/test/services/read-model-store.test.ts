import { beforeEach, describe } from 'mocha'
import { ReadModelStore } from '../../src/services/read-model-store'
import {
  createInstance,
  MagekConfig,
  EntitySnapshotEnvelope,
  Level,
  OptimisticConcurrencyUnexpectedVersionError,
  ProjectionMetadata,
  ProjectionResult,
  ProviderLibrary,
  ReadModelAction,
  ReadModelInterface,
  UUID,
  EntityInterface,
} from '@magek/common'
import { expect } from '../expect'
import { MagekAuthorizer } from '../../src/authorizer'
import { fake, match, replace, restore, SinonFakeTimers, spy, stub, useFakeTimers } from 'sinon'
import { Magek } from '../../src/magek'

describe('ReadModelStore', () => {
  afterEach(() => {
    restore()
  })

  const testConfig = new MagekConfig('Test')
  testConfig.logLevel = Level.error

  class AnImportantEntity {
    public constructor(readonly id: UUID, readonly someKey: UUID, readonly count: number) {}

    public getPrefixedKey(prefix: string): string {
      return `${prefix}-${this.someKey}`
    }
  }

  class AnImportantEntityWithArray {
    public constructor(readonly id: UUID, readonly someKey: Array<UUID>, readonly count: number) {}

    public getPrefixedKey(prefix: string): string {
      return `${prefix}-${this.someKey.join('-')}`
    }
  }

  class AnEntity {
    public constructor(readonly id: UUID, readonly someKey: UUID, readonly count: number) {}
  }

  class SomeReadModel {
    public constructor(readonly id: UUID, readonly count: number) {}

    public static someObserver(entity: AnImportantEntity, current?: SomeReadModel): any {
      const count = (current?.count || 0) + entity.count
      return { id: entity.someKey, kind: 'some', count: count }
    }

    public static someObserverArray(entity: AnImportantEntityWithArray, readModelID: UUID, current?: SomeReadModel): any {
      const count = (current?.count || 0) + entity.count
      return { id: readModelID, kind: 'some', count: count }
    }

    public getId(): UUID {
      return this.id
    }

    public static projectionThatCallsReadModelMethod(
      entity: AnEntity,
      currentReadModel: SomeReadModel
    ): ProjectionResult<SomeReadModel> {
      currentReadModel.getId()
      return ReadModelAction.Nothing
    }

    public static projectionThatCallsEntityMethod(
      entity: AnImportantEntity,
       
      currentReadModel: SomeReadModel
    ): ProjectionResult<SomeReadModel> {
      entity.getPrefixedKey('a prefix')
      return ReadModelAction.Nothing
    }
  }

  class AnotherReadModel {
    public constructor(readonly id: UUID, readonly count: number) {}

    public static anotherObserver(entity: AnImportantEntity, obj: AnotherReadModel): any {
      const count = (obj?.count || 0) + entity.count
      return { id: entity.someKey, kind: 'another', count: count }
    }
  }

  const config = new MagekConfig('test')
  config.provider = {
    graphQL: {
      rawToEnvelope: fake(),
      handleResult: fake(),
    },
  } as unknown as ProviderLibrary
  
  // Mock the adapters instead of provider interfaces
  config.readModelStoreAdapter = {
    fetch: fake(),
    search: fake(),
    store: fake(),
    delete: fake(),
    rawToEnvelopes: fake(),
  } as any
  config.entities[AnImportantEntity.name] = {
    class: AnImportantEntity,
    eventStreamAuthorizer: MagekAuthorizer.authorizeRoles.bind(null, []),
  }
  config.entities[AnEntity.name] = {
    class: AnEntity,
    eventStreamAuthorizer: MagekAuthorizer.authorizeRoles.bind(null, []),
  }
  config.entities[AnImportantEntityWithArray.name] = {
    class: AnImportantEntityWithArray,
    eventStreamAuthorizer: MagekAuthorizer.authorizeRoles.bind(null, []),
  }
  config.readModels[SomeReadModel.name] = {
    class: SomeReadModel,
    authorizer: MagekAuthorizer.allowAccess,
    properties: [],
    before: [],
  }
  config.readModels[AnotherReadModel.name] = {
    class: AnotherReadModel,
    authorizer: MagekAuthorizer.allowAccess,
    properties: [],
    before: [],
  }
  config.projections[AnImportantEntity.name] = [
    {
      class: SomeReadModel,
      methodName: 'someObserver',
      joinKey: 'someKey',
    } as ProjectionMetadata<any, any>,
    {
      class: SomeReadModel,
      methodName: 'projectionThatCallsEntityMethod',
      joinKey: 'someKey',
    } as ProjectionMetadata<any, any>,
    {
      class: AnotherReadModel,
      methodName: 'anotherObserver',
      joinKey: 'someKey',
    } as ProjectionMetadata<any, any>,
  ]
  config.projections[AnImportantEntityWithArray.name] = [
    {
      class: SomeReadModel,
      methodName: 'someObserverArray',
      joinKey: 'someKey',
    } as ProjectionMetadata<any, any>,
  ]
  config.projections['AnEntity'] = [
    {
      class: SomeReadModel,
      methodName: 'projectionThatCallsReadModelMethod',
      joinKey: 'someKey',
    } as ProjectionMetadata<any, any>,
  ]

  function entitySnapshotEnvelopeFor(entityName: string): EntitySnapshotEnvelope {
    let someKeyValue: any = 'joinColumnID'
    if (AnImportantEntityWithArray.name == entityName) {
      someKeyValue = ['joinColumnID', 'anotherJoinColumnID']
    }
    const snapshottedEventCreatedAtDate = new Date()
    const snapshottedEventCreatedAt = snapshottedEventCreatedAtDate.toISOString()
    return {
      version: 1,
      kind: 'snapshot',
      superKind: 'domain',
      entityID: '42',
      entityTypeName: entityName,
      value: {
        id: 'importantEntityID',
        someKey: someKeyValue,
        count: 123,
      } as EntityInterface,
      requestID: 'whatever',
      typeName: entityName,
      createdAt: snapshottedEventCreatedAt,
      persistedAt: new Date().toISOString(),
      snapshottedEventCreatedAt,
    }
  }

  describe('the `project` method', () => {
    context('when the entity class has no projections', () => {
      it('returns without errors and without performing any actions', async () => {
        const entitySnapshotWithNoProjections: EntitySnapshotEnvelope = {
          version: 1,
          kind: 'snapshot',
          superKind: 'domain',
          entityID: '42',
          entityTypeName: 'AConceptWithoutProjections',
          value: { entityID: () => '42' },
          requestID: 'whatever',
          typeName: AnImportantEntity.name,
          createdAt: new Date().toISOString(),
          persistedAt: new Date().toISOString(),
          snapshottedEventCreatedAt: new Date().toISOString(),
        }

        replace(config.readModelStoreAdapter, 'store', fake())
        const readModelStore = new ReadModelStore(config)
        replace(readModelStore, 'fetchReadModel', fake.resolves(null))

        await expect(readModelStore.project(entitySnapshotWithNoProjections)).to.eventually.be.fulfilled

        expect(config.readModelStoreAdapter.store).not.to.have.been.called
        expect(readModelStore.fetchReadModel).not.to.have.been.called
      })
    })

    context('when the new read model returns ReadModelAction.Delete', () => {
      it('deletes the associated read model', async () => {
        replace(config.readModelStoreAdapter, 'store', fake())
        replace(config.readModelStoreAdapter, 'delete', fake())
        replace(Magek, 'config', config) // Needed because the function `Magek.readModel` references `this.config` from `searchFunction`
        replace(config.readModelStoreAdapter, 'search', fake.resolves([]))
        replace(
          ReadModelStore.prototype,
          'getProjectionFunction',
          fake.returns(() => ReadModelAction.Delete)
        )
        const readModelStore = new ReadModelStore(config)

        await readModelStore.project(entitySnapshotEnvelopeFor(AnImportantEntity.name))
        expect(config.readModelStoreAdapter.store).not.to.have.been.called
        expect(config.readModelStoreAdapter.delete).to.have.been.calledThrice
        expect(config.readModelStoreAdapter.search).to.have.been.called
      })
    })

    context('when the new read model returns ReadModelAction.Nothing', () => {
      it('ignores the read model', async () => {
        replace(config.readModelStoreAdapter, 'store', fake())
        replace(config.readModelStoreAdapter, 'delete', fake())
        replace(Magek, 'config', config) // Needed because the function `Magek.readModel` references `this.config` from `searchFunction`
        replace(config.readModelStoreAdapter, 'search', fake.resolves([]))
        replace(
          ReadModelStore.prototype,
          'getProjectionFunction',
          fake.returns(() => ReadModelAction.Nothing)
        )
        const readModelStore = new ReadModelStore(config)

        await readModelStore.project(entitySnapshotEnvelopeFor(AnImportantEntity.name))
        expect(config.readModelStoreAdapter.store).not.to.have.been.called
        expect(config.readModelStoreAdapter.delete).not.to.have.been.called
        expect(config.readModelStoreAdapter.search).to.have.been.called
      })
    })

    context("when the corresponding read models don't exist", () => {
      let clock: SinonFakeTimers
      before(() => {
        clock = useFakeTimers(0)
      })

      after(() => {
        clock.restore()
      })

      it('creates new instances of the read models', async () => {
        replace(config.readModelStoreAdapter, 'store', fake())
        replace(Magek, 'config', config) // Needed because the function `Magek.readModel` references `this.config` from `searchFunction`
        replace(config.readModelStoreAdapter, 'search', fake.resolves([]))
        const readModelStore = new ReadModelStore(config)
        replace(readModelStore, 'fetchReadModel', fake.resolves(null))
        spy(SomeReadModel, 'someObserver')
        spy(AnotherReadModel, 'anotherObserver')
        const entityValue: any = entitySnapshotEnvelopeFor(AnImportantEntity.name).value
        const anEntityInstance = new AnImportantEntity(entityValue.id, entityValue.someKey, entityValue.count)

        await readModelStore.project(entitySnapshotEnvelopeFor(AnImportantEntity.name))

        expect(SomeReadModel.someObserver).to.have.been.calledOnceWith(anEntityInstance, null)
        expect(SomeReadModel.someObserver).to.have.returned({
          id: 'joinColumnID',
          kind: 'some',
          count: 123,
          magekMetadata: {
            version: 1,
            schemaVersion: 1,
            lastUpdateAt: '1970-01-01T00:00:00.000Z',
            lastProjectionInfo: {
              entityId: 'importantEntityID',
              entityName: 'AnImportantEntity',
              entityUpdatedAt: '1970-01-01T00:00:00.000Z',
              projectionMethod: 'SomeReadModel.someObserver',
            },
          },
        })
        expect(AnotherReadModel.anotherObserver).to.have.been.calledOnceWith(anEntityInstance, null)
        expect(AnotherReadModel.anotherObserver).to.have.returned({
          id: 'joinColumnID',
          kind: 'another',
          count: 123,
          magekMetadata: {
            version: 1,
            schemaVersion: 1,
            lastUpdateAt: '1970-01-01T00:00:00.000Z',
            lastProjectionInfo: {
              entityId: 'importantEntityID',
              entityName: 'AnImportantEntity',
              entityUpdatedAt: '1970-01-01T00:00:00.000Z',
              projectionMethod: 'AnotherReadModel.anotherObserver',
            },
          },
        })
        expect(config.readModelStoreAdapter.store).to.have.been.calledTwice
        expect(config.readModelStoreAdapter.store).to.have.been.calledWith(
          config,
          SomeReadModel.name,
          {
            id: 'joinColumnID',
            kind: 'some',
            count: 123,
            magekMetadata: {
              version: 1,
              schemaVersion: 1,
              lastUpdateAt: '1970-01-01T00:00:00.000Z',
              lastProjectionInfo: {
                entityId: 'importantEntityID',
                entityName: 'AnImportantEntity',
                entityUpdatedAt: '1970-01-01T00:00:00.000Z',
                projectionMethod: 'SomeReadModel.someObserver',
              },
            },
          },
          0
        )
        expect(config.readModelStoreAdapter.store).to.have.been.calledWith(
          config,
          AnotherReadModel.name,
          {
            id: 'joinColumnID',
            kind: 'another',
            count: 123,
            magekMetadata: {
              version: 1,
              schemaVersion: 1,
              lastUpdateAt: '1970-01-01T00:00:00.000Z',
              lastProjectionInfo: {
                entityId: 'importantEntityID',
                entityName: 'AnImportantEntity',
                entityUpdatedAt: '1970-01-01T00:00:00.000Z',
                projectionMethod: 'AnotherReadModel.anotherObserver',
              },
            },
          },
          0
        )
      })
    })

    context('when the corresponding read model did exist', () => {
      let clock: SinonFakeTimers
      before(() => {
        clock = useFakeTimers(0)
      })

      after(() => {
        clock.restore()
      })

      it('updates the read model', async () => {
        replace(config.readModelStoreAdapter, 'store', fake())
        const readModelStore = new ReadModelStore(config)
        const someReadModelStoredVersion = 10
        const anotherReadModelStoredVersion = 32
        replace(Magek, 'config', config) // Needed because the function `Magek.readModel` references `this.config` from `searchFunction`
        const searchStub = stub(config.readModelStoreAdapter, 'search')
        searchStub.callsFake(async (_config: any, className: string) => {
          if (className == SomeReadModel.name) {
            return [
              {
                id: 'joinColumnID',
                kind: 'some',
                count: 77,
                magekMetadata: {
                  version: someReadModelStoredVersion,
                  schemaVersion: 1,
                  lastUpdateAt: '1970-01-01T00:00:00.000Z',
                  lastProjectionInfo: {
                    entityId: 'importantEntityID',
                    entityName: 'AnImportantEntity',
                    entityUpdatedAt: '1970-01-01T00:00:00.000Z',
                    projectionMethod: 'SomeReadModel.someObserver',
                  },
                },
              },
            ]
          } else {
            return [
              {
                id: 'joinColumnID',
                kind: 'another',
                count: 177,
                magekMetadata: {
                  version: anotherReadModelStoredVersion,
                  schemaVersion: 1,
                  lastUpdateAt: '1970-01-01T00:00:00.000Z',
                  lastProjectionInfo: {
                    entityId: 'importantEntityID',
                    entityName: 'AnImportantEntity',
                    entityUpdatedAt: '1970-01-01T00:00:00.000Z',
                    projectionMethod: 'AnotherReadModel.anotherObserver',
                  },
                },
              },
            ]
          }
        })
        spy(SomeReadModel, 'someObserver')
        spy(AnotherReadModel, 'anotherObserver')
        const anEntitySnapshot = entitySnapshotEnvelopeFor(AnImportantEntity.name)
        const entityValue: any = anEntitySnapshot.value
        const anEntityInstance = new AnImportantEntity(entityValue.id, entityValue.someKey, entityValue.count)
        await readModelStore.project(anEntitySnapshot)

        expect(SomeReadModel.someObserver).to.have.been.calledOnceWith(
          anEntityInstance,
          match({
            id: 'joinColumnID',
            count: 77,
            kind: 'some',
            magekMetadata: {
              version: someReadModelStoredVersion,
              lastUpdateAt: '1970-01-01T00:00:00.000Z',
              lastProjectionInfo: {
                entityId: 'importantEntityID',
                entityName: 'AnImportantEntity',
                entityUpdatedAt: '1970-01-01T00:00:00.000Z',
                projectionMethod: 'SomeReadModel.someObserver',
              },
            },
          })
        )
        expect(SomeReadModel.someObserver).to.have.returned({
          id: 'joinColumnID',
          kind: 'some',
          count: 200,
          magekMetadata: {
            version: someReadModelStoredVersion + 1,
            schemaVersion: 1,
            lastUpdateAt: '1970-01-01T00:00:00.000Z',
            lastProjectionInfo: {
              entityId: 'importantEntityID',
              entityName: 'AnImportantEntity',
              entityUpdatedAt: '1970-01-01T00:00:00.000Z',
              projectionMethod: 'SomeReadModel.someObserver',
            },
          },
        })
        expect(AnotherReadModel.anotherObserver).to.have.been.calledOnceWith(
          anEntityInstance,
          match({
            id: 'joinColumnID',
            count: 177,
            kind: 'another',
            magekMetadata: {
              version: anotherReadModelStoredVersion,
              lastUpdateAt: '1970-01-01T00:00:00.000Z',
              lastProjectionInfo: {
                entityId: 'importantEntityID',
                entityName: 'AnImportantEntity',
                entityUpdatedAt: '1970-01-01T00:00:00.000Z',
                projectionMethod: 'AnotherReadModel.anotherObserver',
              },
            },
          })
        )
        expect(AnotherReadModel.anotherObserver).to.have.returned({
          id: 'joinColumnID',
          kind: 'another',
          count: 300,
          magekMetadata: {
            version: anotherReadModelStoredVersion + 1,
            schemaVersion: 1,
            lastUpdateAt: '1970-01-01T00:00:00.000Z',
            lastProjectionInfo: {
              entityId: 'importantEntityID',
              entityName: 'AnImportantEntity',
              entityUpdatedAt: '1970-01-01T00:00:00.000Z',
              projectionMethod: 'AnotherReadModel.anotherObserver',
            },
          },
        })
        expect(config.readModelStoreAdapter.store).to.have.been.calledTwice
        expect(config.readModelStoreAdapter.store).to.have.been.calledWith(
          config,
          SomeReadModel.name,
          {
            id: 'joinColumnID',
            kind: 'some',
            count: 200,
            magekMetadata: {
              version: someReadModelStoredVersion + 1,
              schemaVersion: 1,
              lastUpdateAt: '1970-01-01T00:00:00.000Z',
              lastProjectionInfo: {
                entityId: 'importantEntityID',
                entityName: 'AnImportantEntity',
                entityUpdatedAt: '1970-01-01T00:00:00.000Z',
                projectionMethod: 'SomeReadModel.someObserver',
              },
            },
          },
          someReadModelStoredVersion
        )
        expect(config.readModelStoreAdapter.store).to.have.been.calledWith(
          config,
          AnotherReadModel.name,
          {
            id: 'joinColumnID',
            kind: 'another',
            count: 300,
            magekMetadata: {
              version: anotherReadModelStoredVersion + 1,
              schemaVersion: 1,
              lastUpdateAt: '1970-01-01T00:00:00.000Z',
              lastProjectionInfo: {
                entityId: 'importantEntityID',
                entityName: 'AnImportantEntity',
                entityUpdatedAt: '1970-01-01T00:00:00.000Z',
                projectionMethod: 'AnotherReadModel.anotherObserver',
              },
            },
          },
          anotherReadModelStoredVersion
        )
      })
    })

    context('when the projection calls an instance method in the entity', () => {
      it('is executed without failing', async () => {
        const readModelStore = new ReadModelStore(config)
        replace(Magek, 'config', config) // Needed because the function `Magek.readModel` references `this.config` from `searchFunction`
        replace(config.readModelStoreAdapter, 'search', fake.resolves([]))
        const getPrefixedKeyFake = fake()
        replace(AnImportantEntity.prototype, 'getPrefixedKey', getPrefixedKeyFake)
        await readModelStore.project(entitySnapshotEnvelopeFor(AnImportantEntity.name))
        expect(getPrefixedKeyFake).to.have.been.called
      })
    })

    context('when the projection calls an instance method in the read model', () => {
      it('is executed without failing', async () => {
        const readModelStore = new ReadModelStore(config)
        replace(Magek, 'config', config) // Needed because the function `Magek.readModel` references `this.config` from `searchFunction`
        replace(config.readModelStoreAdapter, 'search', fake.resolves([{ id: 'joinColumnID', count: 31415 }]))
        const getIdFake = fake()
        replace(SomeReadModel.prototype, 'getId', getIdFake)
        await readModelStore.project(entitySnapshotEnvelopeFor(AnEntity.name))
        expect(getIdFake).to.have.been.called
      })
    })

    context('when there is high contention and optimistic concurrency is needed', () => {
      let clock: SinonFakeTimers
      before(() => {
        clock = useFakeTimers(0)
      })

      after(() => {
        clock.restore()
      })

      it('retries 5 times when the error OptimisticConcurrencyUnexpectedVersionError happens 4 times', async () => {
        let tryNumber = 1
        const expectedTries = 5
        const fakeStore = fake((config: MagekConfig, readModelName: string): Promise<unknown> => {
          if (readModelName === SomeReadModel.name && tryNumber < expectedTries) {
            tryNumber++
            throw new OptimisticConcurrencyUnexpectedVersionError('test error')
          }
          return Promise.resolve()
        })
        replace(Magek, 'config', config) // Needed because the function `Magek.readModel` references `this.config` from `searchFunction`
        replace(config.readModelStoreAdapter, 'search', fake.resolves([]))
        replace(config.readModelStoreAdapter, 'store', fakeStore)
        const readModelStore = new ReadModelStore(config)
        await readModelStore.project(entitySnapshotEnvelopeFor(AnImportantEntity.name))

        const someReadModelStoreCalls = fakeStore.getCalls().filter((call) => call.args[1] === SomeReadModel.name)
        expect(someReadModelStoreCalls).to.be.have.length(expectedTries)
        someReadModelStoreCalls.forEach((call) => {
          expect(call.args).to.be.deep.equal([
            config,
            SomeReadModel.name,
            {
              id: 'joinColumnID',
              kind: 'some',
              count: 123,
              magekMetadata: {
                version: 1,
                schemaVersion: 1,
                lastUpdateAt: '1970-01-01T00:00:00.000Z',
                lastProjectionInfo: {
                  entityId: 'importantEntityID',
                  entityName: 'AnImportantEntity',
                  entityUpdatedAt: '1970-01-01T00:00:00.000Z',
                  projectionMethod: 'SomeReadModel.someObserver',
                },
              },
            },
            0,
          ])
        })
      })
    })

    context('when multiple read models are projected from Array joinKey', () => {
      let clock: SinonFakeTimers
      before(() => {
        clock = useFakeTimers(0)
      })

      after(() => {
        clock.restore()
      })

      it('creates non-existent read models and updates existing read models', async () => {
        replace(config.readModelStoreAdapter, 'store', fake())
        const readModelStore = new ReadModelStore(config)
        const someReadModelStoredVersion = 10
        replace(Magek, 'config', config) // Needed because the function `Magek.readModel` references `this.config` from `searchFunction`
        replace(
          config.readModelStoreAdapter,
          'search',
          fake.resolves([
            {
              id: 'joinColumnID',
              kind: 'some',
              count: 77,
              magekMetadata: {
                version: someReadModelStoredVersion,
                lastUpdateAt: '1970-01-01T00:00:00.000Z',
                lastProjectionInfo: {
                  entityId: 'importantEntityID',
                  entityName: 'AnImportantEntityWithArray',
                  entityUpdatedAt: '1970-01-01T00:00:00.000Z',
                  projectionMethod: 'SomeReadModel.someObserverArray',
                },
              },
            },
          ])
        )

        spy(SomeReadModel, 'someObserver')
        spy(SomeReadModel, 'someObserverArray')
        const anEntitySnapshot = entitySnapshotEnvelopeFor(AnImportantEntityWithArray.name)
        const entityValue: any = anEntitySnapshot.value
        const anEntityInstance = new AnImportantEntityWithArray(entityValue.id, entityValue.someKey, entityValue.count)
        await readModelStore.project(anEntitySnapshot)

        // Verify the projection method was called twice (once for each ID in the array)
        expect(SomeReadModel.someObserverArray).to.have.been.calledTwice
        
        // Verify first call: existing read model (joinColumnID) 
        expect(SomeReadModel.someObserverArray).to.have.been.calledWith(
          anEntityInstance,
          'joinColumnID', 
          match({
            id: 'joinColumnID',
            kind: 'some',
            count: 77,
            magekMetadata: match.object
          })
        )
        
        // Verify second call: new read model (anotherJoinColumnID)
        expect(SomeReadModel.someObserverArray).to.have.been.calledWith(
          anEntityInstance,
          'anotherJoinColumnID',
          null  // null because this read model doesn't exist yet
        )

        expect(config.readModelStoreAdapter.store).to.have.been.calledTwice
        expect(config.readModelStoreAdapter.store).to.have.been.calledWith(
          config,
          SomeReadModel.name,
          {
            id: 'joinColumnID',
            kind: 'some',
            count: 200,
            magekMetadata: {
              version: someReadModelStoredVersion + 1,
              schemaVersion: 1,
              lastUpdateAt: '1970-01-01T00:00:00.000Z',
              lastProjectionInfo: {
                entityId: 'importantEntityID',
                entityName: 'AnImportantEntityWithArray',
                entityUpdatedAt: '1970-01-01T00:00:00.000Z',
                projectionMethod: 'SomeReadModel.someObserverArray',
              },
            },
          },
          someReadModelStoredVersion
        )
        expect(config.readModelStoreAdapter.store).to.have.been.calledWith(
          config,
          SomeReadModel.name,
          {
            id: 'anotherJoinColumnID',
            kind: 'some',
            count: 123,
            magekMetadata: {
              version: 1,
              schemaVersion: 1,
              lastUpdateAt: '1970-01-01T00:00:00.000Z',
              lastProjectionInfo: {
                entityId: 'importantEntityID',
                entityName: 'AnImportantEntityWithArray',
                entityUpdatedAt: '1970-01-01T00:00:00.000Z',
                projectionMethod: 'SomeReadModel.someObserverArray',
              },
            },
          },
          0
        )
      })
    })

    context('when there is high contention and optimistic concurrency is needed for Array joinKey projections', () => {
      let clock: SinonFakeTimers
      before(() => {
        clock = useFakeTimers(0)
      })

      after(() => {
        clock.restore()
      })

      it('The retries are independent for all Read Models in the array, retries 5 times when the error OptimisticConcurrencyUnexpectedVersionError happens 4 times', async () => {
        let tryNumber = 1
        const expectedAnotherJoinColumnIDTries = 5
        const expectedJoinColumnIDTries = 1
        const fakeStore = fake(
          (config: MagekConfig, readModelName: string, readModel: ReadModelInterface): Promise<unknown> => {
            if (readModelName === SomeReadModel.name) {
              if (readModel.id == 'anotherJoinColumnID' && tryNumber < expectedAnotherJoinColumnIDTries) {
                tryNumber++
                throw new OptimisticConcurrencyUnexpectedVersionError('test error')
              }
            }
            return Promise.resolve()
          }
        )
        replace(config.readModelStoreAdapter, 'store', fakeStore)
        replace(Magek, 'config', config) // Needed because the function `Magek.readModel` references `this.config` from `searchFunction`
        replace(config.readModelStoreAdapter, 'search', fake.resolves([]))

        const readModelStore = new ReadModelStore(config)
        await readModelStore.project(entitySnapshotEnvelopeFor(AnImportantEntityWithArray.name))

        const someReadModelStoreCalls = fakeStore.getCalls().filter((call) => call.args[1] === SomeReadModel.name)
        expect(someReadModelStoreCalls).to.be.have.length(expectedJoinColumnIDTries + expectedAnotherJoinColumnIDTries)
        someReadModelStoreCalls
          .filter((call) => call?.args?.[2]?.id == 'joinColumnID')
          .forEach((call) => {
            expect(call.args).to.be.deep.equal([
              config,
              SomeReadModel.name,
              {
                id: 'joinColumnID',
                kind: 'some',
                count: 123,
                magekMetadata: {
                  version: 1,
                  schemaVersion: 1,
                  lastUpdateAt: '1970-01-01T00:00:00.000Z',
                  lastProjectionInfo: {
                    entityId: 'importantEntityID',
                    entityName: 'AnImportantEntityWithArray',
                    entityUpdatedAt: '1970-01-01T00:00:00.000Z',
                    projectionMethod: 'SomeReadModel.someObserverArray',
                  },
                },
              },
              0,
            ])
          })
        someReadModelStoreCalls
          .filter((call) => call?.args?.[2]?.id == 'anotherJoinColumnID')
          .forEach((call) => {
            expect(call.args).to.be.deep.equal([
              config,
              SomeReadModel.name,
              {
                id: 'anotherJoinColumnID',
                kind: 'some',
                count: 123,
                magekMetadata: {
                  version: 1,
                  schemaVersion: 1,
                  lastUpdateAt: '1970-01-01T00:00:00.000Z',
                  lastProjectionInfo: {
                    entityId: 'importantEntityID',
                    entityName: 'AnImportantEntityWithArray',
                    entityUpdatedAt: '1970-01-01T00:00:00.000Z',
                    projectionMethod: 'SomeReadModel.someObserverArray',
                  },
                },
              },
              0,
            ])
          })
      })
    })

    context('for read models with defined sequenceKeys', () => {
      beforeEach(() => {
        config.readModelSequenceKeys['AnotherReadModel'] = 'count'
      })

      afterEach(() => {
        delete config.readModelSequenceKeys.AnotherReadModel
      })

      it('applies the projections with the right sequenceMetadata', async () => {
        const anEntitySnapshot = entitySnapshotEnvelopeFor(AnImportantEntity.name)
        const anEntityInstance = createInstance(AnImportantEntity, anEntitySnapshot.value) as any
        const readModelStore = new ReadModelStore(config)
        const fakeApplyProjectionToReadModel = fake()
        replace(readModelStore as any, 'applyProjectionToReadModel', fakeApplyProjectionToReadModel)
        replace(Magek, 'config', config) // Needed because the function `Magek.readModel` references `this.config` from `searchFunction`
        replace(config.readModelStoreAdapter, 'search', fake.resolves([]))

        await readModelStore.project(anEntitySnapshot)

        expect(fakeApplyProjectionToReadModel).to.have.been.calledThrice
        for (const projectionMetadata of config.projections[AnImportantEntity.name]) {
          const readModelClassName = projectionMetadata.class.name
          expect(fakeApplyProjectionToReadModel).to.have.been.calledWith(
            anEntitySnapshot,
            anEntityInstance,
            projectionMetadata,
            false,
            undefined,
            anEntitySnapshot,
            'joinColumnID',
            readModelClassName === 'AnotherReadModel' ? { name: 'count', value: 123 } : undefined,
            1
          )
        }
      })
    })
  })

  describe('the `fetchReadModel` method', () => {
    context('with no sequenceMetadata', () => {
      it("returns `undefined` when the read model doesn't exist", async () => {
        replace(config.readModelStoreAdapter, 'fetch', fake.resolves(undefined))
        const readModelStore = new ReadModelStore(config)

        const result = await readModelStore.fetchReadModel(SomeReadModel.name, 'joinColumnID')

        expect(config.readModelStoreAdapter.fetch).to.have.been.calledOnceWithExactly(
          config,
          SomeReadModel.name,
          'joinColumnID',
          undefined
        )
        expect(result).to.be.undefined
      })

      it("returns `undefined` when the read model doesn't exist and provider returns [undefined]", async () => {
        replace(config.readModelStoreAdapter, 'fetch', fake.resolves(undefined))
        const readModelStore = new ReadModelStore(config)

        const result = await readModelStore.fetchReadModel(SomeReadModel.name, 'joinColumnID')

        expect(config.readModelStoreAdapter.fetch).to.have.been.calledOnceWithExactly(
          config,
          SomeReadModel.name,
          'joinColumnID',
          undefined
        )
        expect(result).to.be.undefined
      })

      it('returns an instance of the current read model value when it exists', async () => {
        replace(config.readModelStoreAdapter, 'fetch', fake.resolves({ value: { id: 'joinColumnID', count: 0 } }))
        const readModelStore = new ReadModelStore(config)

        const result = await readModelStore.fetchReadModel(SomeReadModel.name, 'joinColumnID')

        expect(config.readModelStoreAdapter.fetch).to.have.been.calledOnceWithExactly(
          config,
          SomeReadModel.name,
          'joinColumnID',
          undefined
        )
        expect(result).to.be.deep.equal(new SomeReadModel('joinColumnID', 0))
      })
    })

    context('with sequenceMetadata', () => {
      it("calls the provider's fetch method passing the sequenceMetadata object", async () => {
        replace(config.readModelStoreAdapter, 'fetch', fake.resolves({ value: { id: 'joinColumnID' } }))
        const readModelStore = new ReadModelStore(config)

        await readModelStore.fetchReadModel(SomeReadModel.name, 'joinColumnID', {
          name: 'time',
          value: 'now!',
        })

        expect(config.readModelStoreAdapter.fetch).to.have.been.calledOnceWithExactly(
          config,
          SomeReadModel.name,
          'joinColumnID',
          { name: 'time', value: 'now!' }
        )
      })
    })
  })

  describe('the `sequenceKeyForProjection` private method', () => {
    context('when there is no sequence key for the read model in the config', () => {
      it('returns undefined', () => {
        const anEntitySnapshot = entitySnapshotEnvelopeFor(AnImportantEntity.name)
        const anEntityInstance = createInstance(AnImportantEntity, anEntitySnapshot.value) as any
        const readModelStore = new ReadModelStore(config) as any

        expect(readModelStore.sequenceKeyForProjection(anEntityInstance, { class: SomeReadModel })).to.be.undefined
      })
    })

    context('when there is a sequence key for the read model in the config', () => {
      beforeEach(() => {
        config.readModelSequenceKeys['AnotherReadModel'] = 'count'
      })

      afterEach(() => {
        delete config.readModelSequenceKeys.AnotherReadModel
      })

      it('returns a `SequenceMetadata`object with the right sequenceKeyName and sequenceValue values', () => {
        const anEntitySnapshot = entitySnapshotEnvelopeFor(AnImportantEntity.name)
        const anEntityInstance = createInstance(AnImportantEntity, anEntitySnapshot.value) as any
        const readModelStore = new ReadModelStore(config) as any

        expect(readModelStore.sequenceKeyForProjection(anEntityInstance, { class: AnotherReadModel })).to.be.deep.equal(
          {
            name: 'count',
            value: 123,
          }
        )
      })
    })
  })

  // TODO: This method is tested indirectly in the `project` method tests, but it would be nice to have dedicated unit tests for it too
  describe('the `applyProjectionToReadModel` private method', () => {
    context('when `ReadModelAction.Delete` is returned', () => {
      it('deletes the read model') // TODO
    })
    context('when `ReadModelAction.Nothing` is returned', () => {
      it('does not update the read model state') // TODO
    })
    context('with no sequenceMetadata', () => {
      it('calls the `fetchReadodel` method with no sequenceMetadata object') // TODO
    })
    context('with sequenceMetadata', () => {
      it('calls the `fetchReadModel` method passing the sequenceMetadata object') // TODO
    })
  })
})