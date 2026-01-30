import { expect } from '../expect'
import { nonExposed } from '../../src/decorators/'
import { Magek } from '../../src'
import { MagekConfig, UUID } from '@magek/common'
import { field, Entity } from '../../src/decorators'

describe('the `nonExposed` decorator', () => {
  afterEach(() => {
    Magek.configureCurrentEnv((config: MagekConfig) => {
      for (const propName in config.nonExposedGraphQLMetadataKey) {
        delete config.nonExposedGraphQLMetadataKey[propName]
      }
      for (const propName in config.entities) {
        delete config.entities[propName]
      }
    })
  })

  it('registers the field name in config.nonExposedGraphQLMetadataKey', () => {
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

    const nonExposedFields = Magek.config.nonExposedGraphQLMetadataKey['User']

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

    const nonExposedFields = Magek.config.nonExposedGraphQLMetadataKey['Account']

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

    const nonExposedMembers = Magek.config.nonExposedGraphQLMetadataKey['Document']

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

    const nonExposedFields = Magek.config.nonExposedGraphQLMetadataKey['Product']

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

    expect(Magek.config.nonExposedGraphQLMetadataKey['PublicEntity']).to.include('secret1')
    expect(Magek.config.nonExposedGraphQLMetadataKey['PublicEntity']).to.not.include('secret2')
    expect(Magek.config.nonExposedGraphQLMetadataKey['PrivateEntity']).to.include('secret2')
    expect(Magek.config.nonExposedGraphQLMetadataKey['PrivateEntity']).to.not.include('secret1')
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
    const nonExposedFields = Magek.config.nonExposedGraphQLMetadataKey['SimpleEntity']

    expect(nonExposedFields).to.exist
    expect(nonExposedFields).to.be.an('Array')
    expect(nonExposedFields).to.include('hiddenField')
  })
})
