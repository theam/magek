 
import { expect } from '../expect'
import { describe } from 'mocha'
import { ReadModel, Magek, Entity, Projects, sequencedBy, Role, CalculatedField } from '../../src'
import { UUID, ProjectionResult, UserEnvelope } from '@magek/common'
import { MagekAuthorizer } from '../../src/authorizer'
import { fake, restore } from 'sinon'

describe('the `ReadModel` decorator', () => {
  afterEach(() => {
    restore()
    Magek.configure('test', (config) => {
      for (const propName in config.readModels) {
        delete config.readModels[propName]
      }
    })
  })

  context('when the `authorize` parameter is not provided', () => {
    it('injects the read model metadata in the Magek configuration and denies access', () => {
      @ReadModel({})
      class Post {
        public constructor(readonly id: UUID, readonly title: string) {}
      }

      expect(Magek.config.readModels['Post']).to.deep.equal({
        class: Post,
        authorizer: MagekAuthorizer.denyAccess,
        before: [],
        properties: [
          {
            name: 'id',
            typeInfo: {
              importPath: '@magek/common',
              isNullable: false,
              isGetAccessor: false,
              name: 'UUID',
              parameters: [],
              type: UUID,
              typeGroup: 'Class',
              typeName: 'UUID',
            },
            dependencies: [],
          },
          {
            name: 'title',
            typeInfo: {
              isNullable: false,
              isGetAccessor: false,
              name: 'string',
              parameters: [],
              type: String,
              typeGroup: 'String',
              typeName: 'String',
            },
            dependencies: [],
          },
        ],
      })
    })
  })

  context('when before filter functions are provided', () => {
    it('injects the read model metadata in the Magek configuration with the provided before functions', () => {
      const fakeBeforeFilter = fake.resolves(undefined)

      @ReadModel({
        before: [fakeBeforeFilter],
      })
      class Post {
        public constructor(readonly id: UUID, readonly aStringProp: string) {}
      }

      expect(Magek.config.readModels['Post'].class).to.equal(Post)
      expect(Magek.config.readModels['Post'].authorizer).to.be.equal(MagekAuthorizer.denyAccess)
      expect(Magek.config.readModels['Post'].before).to.be.an('Array')
      expect(Magek.config.readModels['Post'].before).to.have.lengthOf(1)
      expect(Magek.config.readModels['Post'].before[0]).to.be.equal(fakeBeforeFilter)
    })
  })

  context('when the `authorize` parameter is set to `all`', () => {
    it('registers the read model in Magek configuration and allows public access', () => {
      @ReadModel({
        authorize: 'all',
      })
      class SomeReadModel {
        public constructor(
          readonly id: UUID,
          readonly aStringProp: string,
          readonly aNumberProp: number,
          readonly aReadonlyArray: ReadonlyArray<string>
        ) {}
      }

      expect(Magek.config.readModels['SomeReadModel']).to.be.deep.equal({
        class: SomeReadModel,
        authorizer: MagekAuthorizer.allowAccess,
        before: [],
        properties: [
          {
            name: 'id',
            typeInfo: {
              importPath: '@magek/common',
              isNullable: false,
              isGetAccessor: false,
              name: 'UUID',
              parameters: [],
              type: UUID,
              typeGroup: 'Class',
              typeName: 'UUID',
            },
            dependencies: [],
          },
          {
            name: 'aStringProp',
            typeInfo: {
              isNullable: false,
              isGetAccessor: false,
              name: 'string',
              parameters: [],
              type: String,
              typeGroup: 'String',
              typeName: 'String',
            },
            dependencies: [],
          },
          {
            name: 'aNumberProp',
            typeInfo: {
              isNullable: false,
              isGetAccessor: false,
              name: 'number',
              parameters: [],
              type: Number,
              typeGroup: 'Number',
              typeName: 'Number',
            },
            dependencies: [],
          },
          {
            name: 'aReadonlyArray',
            typeInfo: {
              isNullable: false,
              isGetAccessor: false,
              name: 'readonly string[]',
              parameters: [
                {
                  isNullable: false,
                  isGetAccessor: false,
                  name: 'string',
                  parameters: [],
                  type: String,
                  typeGroup: 'String',
                  typeName: 'String',
                },
              ],
              type: undefined,
              typeGroup: 'ReadonlyArray',
              typeName: 'ReadonlyArray',
            },
            dependencies: [],
          },
        ],
      })
    })
  })

  context('when the `authorize` parameter is set to an array of roles', () => {
    it('registers the read model in Magek configuration and allows access to the specified roles', async () => {
      @Role({
        auth: {},
      })
      class Admin {}

      @ReadModel({
        authorize: [Admin],
      })
      class SomeReadModel {
        public constructor(readonly id: UUID, readonly aStringProp: string) {}
      }

      expect(Magek.config.readModels['SomeReadModel'].class).to.be.equal(SomeReadModel)

      const authorizerFunction = Magek.config.readModels['SomeReadModel']?.authorizer
      console.log('-----------------------------------')
      console.log(authorizerFunction)
      console.log('-----------------------------------')
      expect(authorizerFunction).not.to.be.undefined

      const fakeUser = {
        roles: ['User'],
      } as UserEnvelope
      await expect(authorizerFunction(fakeUser)).not.to.be.eventually.fulfilled

      const fakeAdmin = {
        roles: ['Admin'],
      } as UserEnvelope
      await expect(authorizerFunction(fakeAdmin)).to.be.eventually.fulfilled
    })
  })

  context('when the `authorize` parameter is set to a function', () => {
    it('registers the read model in Magek configuration and allows access when the authorizer function is fulfilled', async () => {
      @ReadModel({
        authorize: async (currentUser?: UserEnvelope) => {
          const permissions = currentUser?.claims?.permissions as string[]
          if (permissions && permissions.includes('Rock')) {
            return Promise.resolve()
          }
          return Promise.reject('This is not for you!')
        },
      })
      class RockingData {
        public constructor(readonly id: UUID, readonly aStringProp: string) {}
      }

      expect(Magek.config.readModels['RockingData'].class).to.be.equal(RockingData)

      const fakeUser = {
        claims: {
          permissions: ['Rock'],
        },
      } as unknown as UserEnvelope
      await expect(Magek.config.readModels['RockingData'].authorizer(fakeUser)).to.be.eventually.fulfilled

      const fakeUser2 = {
        claims: {
          permissions: ['Reaggeton'],
        },
      } as unknown as UserEnvelope
      await expect(Magek.config.readModels['RockingData'].authorizer(fakeUser2)).not.to.be.eventually.fulfilled
    })
  })
})

describe('the `Projects` decorator', () => {
  afterEach(() => {
    Magek.configure('test', (config) => {
      for (const propName in config.readModels) {
        delete config.readModels[propName]
      }
      for (const propName in config.projections) {
        delete config.projections[propName]
      }
    })
  })

  it('registers a read model method as an entity projection in Magek configuration', () => {
    @Entity
    class SomeEntity {
      public constructor(readonly id: UUID) {}
    }

    @ReadModel({
      authorize: 'all',
    })
    class SomeReadModel {
      public constructor(readonly id: UUID) {}

      @Projects(SomeEntity, 'id')
      public static observeSomeEntity(entity: SomeEntity): ProjectionResult<SomeReadModel> {
        throw new Error(`not implemented for ${entity}`)
      }
    }

    const someEntityObservers = Magek.config.projections['SomeEntity']

    expect(Magek.config.readModels).to.contain(SomeReadModel)
    expect(someEntityObservers).to.be.an('Array')
    expect(someEntityObservers).to.deep.include({
      class: SomeReadModel,
      methodName: 'observeSomeEntity',
      joinKey: 'id',
    })
  })

  describe('the `sequencedBy` decorator', () => {
    afterEach(() => {
      Magek.configure('test', (config) => {
        for (const propName in config.readModels) {
          delete config.readModels[propName]
        }
        for (const propName in config.projections) {
          delete config.projections[propName]
        }
      })
    })

    it('registers a sequence key in the read model', () => {
      @ReadModel({
        authorize: 'all',
      })
      class SequencedReadModel {
        public constructor(readonly id: UUID, @sequencedBy readonly timestamp: string) {}
      }

      expect(Magek.config.readModelSequenceKeys).not.to.be.null
      expect(Magek.config.readModelSequenceKeys[SequencedReadModel.name]).to.be.a('String')
      expect(Magek.config.readModelSequenceKeys[SequencedReadModel.name]).to.be.equal('timestamp')
    })
  })
})

describe('the `CalculatedField` decorator', () => {
  afterEach(() => {
    restore()
    Magek.configure('test', (config) => {
      for (const propName in config.readModels) {
        delete config.readModels[propName]
      }
    })
  })

  it('adds calculated field metadata to the read model class', () => {
    @ReadModel({
      authorize: 'all',
    })
    class PersonReadModel {
      public constructor(readonly id: UUID, readonly firstName: string, readonly lastName: string) {}

      @CalculatedField({ dependsOn: ['firstName', 'lastName'] })
      public get fullName(): string {
        return `${this.firstName} ${this.lastName}`
      }
    }

    expect(Magek.config.readModels['PersonReadModel']).to.be.deep.equal({
      class: PersonReadModel,
      authorizer: MagekAuthorizer.allowAccess,
      before: [],
      properties: [
        {
          name: 'id',
          typeInfo: {
            importPath: '@magek/common',
            isNullable: false,
            isGetAccessor: false,
            name: 'UUID',
            parameters: [],
            type: UUID,
            typeGroup: 'Class',
            typeName: 'UUID',
          },
          dependencies: [],
        },
        {
          name: 'firstName',
          typeInfo: {
            isNullable: false,
            isGetAccessor: false,
            name: 'string',
            parameters: [],
            type: String,
            typeGroup: 'String',
            typeName: 'String',
          },
          dependencies: [],
        },
        {
          name: 'lastName',
          typeInfo: {
            isNullable: false,
            isGetAccessor: false,
            name: 'string',
            parameters: [],
            type: String,
            typeGroup: 'String',
            typeName: 'String',
          },
          dependencies: [],
        },
        {
          name: 'fullName',
          typeInfo: {
            isNullable: false,
            isGetAccessor: true,
            name: 'string',
            parameters: [],
            type: String,
            typeGroup: 'String',
            typeName: 'String',
          },
          dependencies: ['firstName', 'lastName'],
        },
      ],
    })
  })
})
