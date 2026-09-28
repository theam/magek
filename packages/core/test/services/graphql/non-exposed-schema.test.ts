import { GraphQLObjectType } from 'graphql'
import { Level, MagekConfig, UUID } from '@magek/common'
import { expect } from '../../expect'
import { Magek } from '../../../src'
import { field, nonExposed, ReadModel } from '../../../src/decorators'
import { GraphQLGenerator } from '../../../src/services/graphql/graphql-generator'

const fixtureName = 'NonExposedSchemaFixture'

function clearFixture(config: MagekConfig): void {
  delete config.readModels[fixtureName]
  delete config.nonExposedGraphQLMetadataKey[fixtureName]
}

describe('GraphQL schema @nonExposed fields', () => {
  beforeEach(() => {
    delete (GraphQLGenerator as unknown as { schema?: unknown }).schema
  })

  afterEach(() => {
    delete (GraphQLGenerator as unknown as { schema?: unknown }).schema
    clearFixture(Magek.config)
  })

  it('leaves @nonExposed fields out of the generated read model type', () => {
    @ReadModel({ authorize: 'all' })
    class NonExposedSchemaFixture {
      @field((type) => UUID)
      public readonly id!: UUID

      @field((type) => String)
      public readonly publicField!: string

      @nonExposed
      @field((type) => String)
      public readonly secretField!: string
    }

    const config = new MagekConfig('schema-non-exposed')
    config.logLevel = Level.error
    config.readModels[fixtureName] = Magek.config.readModels[fixtureName]
    config.nonExposedGraphQLMetadataKey[fixtureName] = Magek.config.nonExposedGraphQLMetadataKey[fixtureName]
    clearFixture(Magek.config)

    const schema = GraphQLGenerator.generateSchema(config)
    const readModelType = schema.getType(NonExposedSchemaFixture.name) as GraphQLObjectType
    const fields = readModelType.getFields()

    expect(fields.publicField).to.exist
    expect(fields.secretField).to.equal(undefined)
    expect(fields.id).to.exist
  })
})
