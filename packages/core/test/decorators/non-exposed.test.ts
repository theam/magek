import { expect } from '../expect'
import { nonExposed } from '../../src/decorators/'
import { Magek } from '../../src'
import { MagekConfig, UUID, Register } from '@magek/common'
import { field, Entity, ReadModel, Command, Query } from '../../src/decorators'

describe('the `nonExposed` decorator', () => {
  afterEach(() => {
    Magek.configureCurrentEnv((config: MagekConfig) => {
      for (const propName in config.registry.nonExposedGraphQLMetadataKey) {
        delete config.registry.nonExposedGraphQLMetadataKey[propName]
      }
      for (const propName in config.registry.entities) {
        delete config.registry.entities[propName]
      }
      for (const propName in config.registry.readModels) {
        delete config.registry.readModels[propName]
      }
      for (const propName in config.registry.commandHandlers) {
        delete config.registry.commandHandlers[propName]
      }
      for (const propName in config.registry.queryHandlers) {
        delete config.registry.queryHandlers[propName]
      }
    })
  })

  it('registers the field name in config.registry.nonExposedGraphQLMetadataKey', () => {
    @Entity
    class User {
      @field(type => UUID)
      public readonly id!: UUID

      @field()
      public readonly username!: string

      @nonExposed
      @field()
      public readonly passwordHash!: string
    }

    // No instance creation needed - metadata is registered during class decoration
    User // Reference to prevent unused warning

    const nonExposedFields = Magek.config.registry.nonExposedGraphQLMetadataKey['User']

    expect(nonExposedFields).to.be.an('Array')
    expect(nonExposedFields).to.include('passwordHash')
  })

  it('allows marking multiple fields as non-exposed', () => {
    @Entity
    class Account {
      @field(type => UUID)
      public readonly id!: UUID

      @field()
      public readonly email!: string

      @nonExposed
      @field()
      public readonly internalId!: string

      @nonExposed
      @field()
      public readonly secretKey!: string

      @nonExposed
      @field()
      public readonly encryptedData!: string
    }

    // No instance creation needed - metadata is registered during class decoration
    Account // Reference to prevent unused warning

    const nonExposedFields = Magek.config.registry.nonExposedGraphQLMetadataKey['Account']

    expect(nonExposedFields).to.be.an('Array')
    expect(nonExposedFields).to.have.lengthOf(3)
    expect(nonExposedFields).to.include('internalId')
    expect(nonExposedFields).to.include('secretKey')
    expect(nonExposedFields).to.include('encryptedData')
  })

  it('works on methods as well as fields', () => {
    @Entity
    class Document {
      @field(type => UUID)
      public readonly id!: UUID

      @field()
      public readonly title!: string

      @nonExposed
      public getInternalMetadata(): object {
        return {}
      }
    }

    // No instance creation needed - metadata is registered during class decoration
    Document // Reference to prevent unused warning

    const nonExposedMembers = Magek.config.registry.nonExposedGraphQLMetadataKey['Document']

    expect(nonExposedMembers).to.be.an('Array')
    expect(nonExposedMembers).to.include('getInternalMetadata')
  })

  it('does not include non-decorated fields in the non-exposed list', () => {
    @Entity
    class Product {
      @field(type => UUID)
      public readonly id!: UUID

      @field()
      public readonly name!: string

      @field()
      public readonly price!: number

      @nonExposed
      @field()
      public readonly costPrice!: number
    }

    // No instance creation needed - metadata is registered during class decoration
    Product // Reference to prevent unused warning

    const nonExposedFields = Magek.config.registry.nonExposedGraphQLMetadataKey['Product']

    expect(nonExposedFields).to.have.lengthOf(1)
    expect(nonExposedFields).to.include('costPrice')
    expect(nonExposedFields).to.not.include('name')
    expect(nonExposedFields).to.not.include('price')
  })

  it('stores non-exposed fields per class separately', () => {
    @Entity
    class PublicEntity {
      @field(type => UUID)
      public readonly id!: UUID

      @nonExposed
      @field()
      public readonly secret1!: string
    }

    @Entity
    class PrivateEntity {
      @field(type => UUID)
      public readonly id!: UUID

      @nonExposed
      @field()
      public readonly secret2!: string
    }

    // No instance creation needed - metadata is registered during class decoration
    PublicEntity // Reference to prevent unused warning
    PrivateEntity // Reference to prevent unused warning

    expect(Magek.config.registry.nonExposedGraphQLMetadataKey['PublicEntity']).to.include('secret1')
    expect(Magek.config.registry.nonExposedGraphQLMetadataKey['PublicEntity']).to.not.include('secret2')
    expect(Magek.config.registry.nonExposedGraphQLMetadataKey['PrivateEntity']).to.include('secret2')
    expect(Magek.config.registry.nonExposedGraphQLMetadataKey['PrivateEntity']).to.not.include('secret1')
  })

  it('creates an empty array entry for class if no non-exposed fields exist initially', () => {
    @Entity
    class SimpleEntity {
      @field(type => UUID)
      public readonly id!: UUID

      @nonExposed
      @field()
      public readonly hiddenField!: string
    }

    // No instance creation needed - metadata is registered during class decoration
    SimpleEntity // Reference to prevent unused warning

    // The nonExposedGraphQLMetadataKey for SimpleEntity should exist and contain the field
    const nonExposedFields = Magek.config.registry.nonExposedGraphQLMetadataKey['SimpleEntity']

    expect(nonExposedFields).to.exist
    expect(nonExposedFields).to.be.an('Array')
    expect(nonExposedFields).to.include('hiddenField')
  })

  describe('with @ReadModel decorator', () => {
    it('registers non-exposed fields for ReadModels', () => {
      @ReadModel({ authorize: 'all' })
      class UserReadModel {
        @field(type => UUID)
        public readonly id!: UUID

        @field()
        public readonly displayName!: string

        @nonExposed
        @field()
        public readonly internalScore!: number

        @nonExposed
        @field()
        public readonly privateNotes!: string
      }

      UserReadModel // Reference to prevent unused warning

      const nonExposedFields = Magek.config.registry.nonExposedGraphQLMetadataKey['UserReadModel']

      expect(nonExposedFields).to.be.an('Array')
      expect(nonExposedFields).to.have.lengthOf(2)
      expect(nonExposedFields).to.include('internalScore')
      expect(nonExposedFields).to.include('privateNotes')
      expect(nonExposedFields).to.not.include('displayName')
    })
  })

  describe('with @Command decorator', () => {
    it('registers non-exposed fields for Commands', () => {
      @Command({ authorize: 'all' })
      class CreateUser {
        @field()
        public readonly username!: string

        @field()
        public readonly email!: string

        @nonExposed
        @field()
        public readonly internalTrackingId!: string

        public static async handle(_command: CreateUser, _register: Register): Promise<void> {
          // Implementation
        }
      }

      CreateUser // Reference to prevent unused warning

      const nonExposedFields = Magek.config.registry.nonExposedGraphQLMetadataKey['CreateUser']

      expect(nonExposedFields).to.be.an('Array')
      expect(nonExposedFields).to.have.lengthOf(1)
      expect(nonExposedFields).to.include('internalTrackingId')
      expect(nonExposedFields).to.not.include('username')
      expect(nonExposedFields).to.not.include('email')
    })
  })

  describe('with @Query decorator', () => {
    it('registers non-exposed fields for Queries', () => {
      @Query({ authorize: 'all' })
      class GetUserStats {
        @field()
        public readonly userId!: string

        @nonExposed
        @field()
        public readonly debugInfo!: string

        public static async handle(_query: GetUserStats): Promise<object> {
          return {}
        }
      }

      GetUserStats // Reference to prevent unused warning

      const nonExposedFields = Magek.config.registry.nonExposedGraphQLMetadataKey['GetUserStats']

      expect(nonExposedFields).to.be.an('Array')
      expect(nonExposedFields).to.have.lengthOf(1)
      expect(nonExposedFields).to.include('debugInfo')
      expect(nonExposedFields).to.not.include('userId')
    })
  })
})
