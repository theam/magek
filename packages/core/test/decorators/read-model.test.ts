 
import { expect } from '../expect'
import { describe } from 'mocha'
import { ReadModel, Magek, Entity, projects, sequencedBy, Role, calculatedField } from '../../src'
import { UUID, ProjectionResult, UserEnvelope, field } from '@magek/common'
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
        @field((type) => UUID)
        public readonly id!: UUID

        @field((type) => String)
        public readonly title!: string
      }

      const postConfig = Magek.config.readModels['Post']
      expect(postConfig).to.be.an('object')
      expect(postConfig.class).to.equal(Post)
      expect(postConfig.authorizer).to.equal(MagekAuthorizer.denyAccess)
      expect(postConfig.before).to.deep.equal([])
      expect(postConfig.properties).to.have.lengthOf(2)
      expect(postConfig.properties[0].name).to.equal('id')
      expect(postConfig.properties[0].typeInfo.name).to.equal('UUID')
      expect(postConfig.properties[0].typeInfo.typeGroup).to.equal('Class')
      expect(postConfig.properties[0].typeInfo.type).to.equal(UUID)
      expect(postConfig.properties[1].name).to.equal('title')
      expect(postConfig.properties[1].typeInfo.name).to.equal('string')
      expect(postConfig.properties[1].typeInfo.typeGroup).to.equal('String')
    })
  })

  context('when before filter functions are provided', () => {
    it('injects the read model metadata in the Magek configuration with the provided before functions', () => {
      const fakeBeforeFilter = fake.resolves(undefined)

      @ReadModel({
        before: [fakeBeforeFilter],
      })
      class Post {
        @field((type) => UUID)
        public readonly id!: UUID

        @field((type) => String)
        public readonly aStringProp!: string
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
        @field(type => UUID)
        public readonly id!: UUID

        @field(type => String)
        public readonly aStringProp!: string

        @field(type => Number)
        public readonly aNumberProp!: number

        @field(type => [String])
        public readonly aReadonlyArray!: ReadonlyArray<string>
      }

      const readModelConfig = Magek.config.readModels['SomeReadModel']
      expect(readModelConfig).to.be.an('object')
      expect(readModelConfig.class).to.equal(SomeReadModel)
      expect(readModelConfig.authorizer).to.equal(MagekAuthorizer.allowAccess)
      expect(readModelConfig.before).to.deep.equal([])
      expect(readModelConfig.properties).to.have.lengthOf(4)

      // Check id field
      expect(readModelConfig.properties[0].name).to.equal('id')
      expect(readModelConfig.properties[0].typeInfo.name).to.equal('UUID')
      expect(readModelConfig.properties[0].typeInfo.typeGroup).to.equal('Class')
      expect(readModelConfig.properties[0].typeInfo.type).to.equal(UUID)
      expect(readModelConfig.properties[0].dependencies).to.deep.equal([])

      // Check aStringProp field
      expect(readModelConfig.properties[1].name).to.equal('aStringProp')
      expect(readModelConfig.properties[1].typeInfo.name).to.equal('string')
      expect(readModelConfig.properties[1].typeInfo.typeGroup).to.equal('String')
      expect(readModelConfig.properties[1].dependencies).to.deep.equal([])

      // Check aNumberProp field
      expect(readModelConfig.properties[2].name).to.equal('aNumberProp')
      expect(readModelConfig.properties[2].typeInfo.name).to.equal('number')
      expect(readModelConfig.properties[2].typeInfo.typeGroup).to.equal('Number')
      expect(readModelConfig.properties[2].dependencies).to.deep.equal([])

      // Check aReadonlyArray field (note: runtime decorators can't distinguish Array from ReadonlyArray)
      expect(readModelConfig.properties[3].name).to.equal('aReadonlyArray')
      expect(readModelConfig.properties[3].typeInfo.typeGroup).to.equal('Array')
      expect(readModelConfig.properties[3].typeInfo.parameters).to.have.lengthOf(1)
      expect(readModelConfig.properties[3].typeInfo.parameters[0].typeGroup).to.equal('String')
      expect(readModelConfig.properties[3].dependencies).to.deep.equal([])
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
        @field(type => UUID)
        public readonly id!: UUID

        @field()
        public readonly aStringProp!: string
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
        @field(type => UUID)
        public readonly id!: UUID

        @field()
        public readonly aStringProp!: string
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

describe('the `projects` decorator', () => {
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
      @field(type => UUID)
      public readonly id!: UUID
    }

    @ReadModel({
      authorize: 'all',
    })
    class SomeReadModel {
      @field(type => UUID)
      public readonly id!: UUID

      @projects(SomeEntity, 'id')
      public static observeSomeEntity(entity: SomeEntity): ProjectionResult<SomeReadModel> {
        throw new Error(`not implemented for ${entity}`)
      }
    }

    const someEntityObservers = Magek.config.projections['SomeEntity']

    expect(Magek.config.readModels['SomeReadModel']).to.be.an('object')
    expect(Magek.config.readModels['SomeReadModel'].class).to.equal(SomeReadModel)
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
        @field(type => UUID)
        public readonly id!: UUID

        @sequencedBy
        @field(type => String)
        public readonly timestamp!: string
      }

      expect(Magek.config.readModelSequenceKeys).not.to.be.null
      expect(Magek.config.readModelSequenceKeys[SequencedReadModel.name]).to.be.a('String')
      expect(Magek.config.readModelSequenceKeys[SequencedReadModel.name]).to.be.equal('timestamp')
    })
  })
})

describe('the `calculatedField` decorator', () => {
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
      @field(type => UUID)
      public readonly id!: UUID

      @field(type => String)
      public readonly firstName!: string

      @field(type => String)
      public readonly lastName!: string

      @calculatedField({ dependsOn: ['firstName', 'lastName'] })
      public get fullName(): string {
        return `${this.firstName} ${this.lastName}`
      }
    }

    const readModelConfig = Magek.config.readModels['PersonReadModel']
    expect(readModelConfig).to.be.an('object')
    expect(readModelConfig.class).to.equal(PersonReadModel)
    expect(readModelConfig.authorizer).to.equal(MagekAuthorizer.allowAccess)
    expect(readModelConfig.before).to.deep.equal([])
    expect(readModelConfig.properties).to.have.lengthOf(4)

    // Check id field
    expect(readModelConfig.properties[0].name).to.equal('id')
    expect(readModelConfig.properties[0].typeInfo.name).to.equal('UUID')
    expect(readModelConfig.properties[0].typeInfo.typeGroup).to.equal('Class')
    expect(readModelConfig.properties[0].typeInfo.type).to.equal(UUID)
    expect(readModelConfig.properties[0].dependencies).to.deep.equal([])

    // Check firstName field
    expect(readModelConfig.properties[1].name).to.equal('firstName')
    expect(readModelConfig.properties[1].typeInfo.name).to.equal('string')
    expect(readModelConfig.properties[1].typeInfo.typeGroup).to.equal('String')
    expect(readModelConfig.properties[1].dependencies).to.deep.equal([])

    // Check lastName field
    expect(readModelConfig.properties[2].name).to.equal('lastName')
    expect(readModelConfig.properties[2].typeInfo.name).to.equal('string')
    expect(readModelConfig.properties[2].typeInfo.typeGroup).to.equal('String')
    expect(readModelConfig.properties[2].dependencies).to.deep.equal([])

    // Check fullName calculated field
    // Note: In Stage 3 decorators, we can't determine getter return type without design:returntype metadata
    expect(readModelConfig.properties[3].name).to.equal('fullName')
    expect(readModelConfig.properties[3].typeInfo.typeGroup).to.equal('Other') // 'any' type
    expect(readModelConfig.properties[3].typeInfo.isGetAccessor).to.equal(true)
    expect(readModelConfig.properties[3].dependencies).to.deep.equal(['firstName', 'lastName'])
  })
})
