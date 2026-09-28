import { expect } from '../../../expect'
import { GraphQLInputObjectType } from 'graphql'
import { MagekConfig, getLogger } from '@magek/common'
import { field, nonExposed } from '../../../../src/decorators'
import { GraphQLTypeInformer } from '../../../../src/services/graphql/graphql-type-informer'
import { GraphqlQuerySortBuilder } from '../../../../src/services/graphql/query-helpers/graphql-query-sort-builder'

function sortFieldsFor(
  parent: new (...args: unknown[]) => unknown,
  nested: new (...args: unknown[]) => unknown,
  config: MagekConfig
): { sortFields: ReturnType<GraphQLInputObjectType['getFields']>; inputType: GraphQLInputObjectType } {
  const logger = getLogger(config, 'test')
  const typeInformer = new GraphQLTypeInformer(logger)
  const builder = new GraphqlQuerySortBuilder(typeInformer, config)
  const args = builder.generateSortArguments(parent, [])
  const sortType = args.address.type as GraphQLInputObjectType
  const inputType = typeInformer.generateGraphQLTypeForClass(nested, ['internalCode'], true) as GraphQLInputObjectType
  return { sortFields: sortType.getFields(), inputType }
}

describe('GraphqlQuerySortBuilder nested @nonExposed fields', () => {
  it('omits @nonExposed fields on a nested class that is not itself registered', () => {
    class MetadataAddress {
      @field((type) => String)
      public readonly street!: string

      @nonExposed
      @field((type) => String)
      public readonly internalCode!: string
    }

    class MetadataUser {
      @field((type) => MetadataAddress)
      public readonly address!: MetadataAddress
    }

    const { sortFields, inputType } = sortFieldsFor(MetadataUser, MetadataAddress, new MagekConfig('test'))

    expect(sortFields).to.have.property('street')
    expect(sortFields).to.not.have.property('internalCode')
    expect(inputType.getFields()).to.have.property('internalCode')
  })

  it('omits fields listed for the nested class name in nonExposedGraphQLMetadataKey', () => {
    class ConfigAddress {
      @field((type) => String)
      public readonly street!: string

      @field((type) => String)
      public readonly internalCode!: string
    }

    class ConfigUser {
      @field((type) => ConfigAddress)
      public readonly address!: ConfigAddress
    }

    const config = new MagekConfig('test')
    config.nonExposedGraphQLMetadataKey[ConfigAddress.name] = ['internalCode']

    const { sortFields } = sortFieldsFor(ConfigUser, ConfigAddress, config)

    expect(sortFields).to.have.property('street')
    expect(sortFields).to.not.have.property('internalCode')
  })
})
