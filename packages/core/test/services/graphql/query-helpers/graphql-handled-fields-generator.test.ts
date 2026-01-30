import { expect } from '../../../expect'
import { GraphQLHandledFieldsGenerator } from '../../../../src/services/graphql/query-helpers/graphql-handled-fields-generator'
import { GraphQLTypeInformer } from '../../../../src/services/graphql/graphql-type-informer'
import { MagekConfig, getLogger, UUID, PropertyMetadata } from '@magek/common'
import { stub } from 'sinon'

describe('GraphQLHandledFieldsGenerator', () => {
  describe('with @returns decorated handle method', () => {
    it('should use the UUID return type from metadata instead of defaulting to Boolean', () => {
      const config = new MagekConfig('test')
      const logger = getLogger(config, 'test')
      const typeInformer = new GraphQLTypeInformer(logger)

      // Simulate a command class that has a handle method with UUID return type (wrapped in Promise)
      class CreateNote {}

      // Create handle method metadata as it would be set by @returns(type => UUID)
      const handleMethodMetadata: PropertyMetadata = {
        name: 'handle',
        typeInfo: {
          name: 'Promise<UUID>',
          typeGroup: 'Class',
          typeName: 'Promise',
          parameters: [
            {
              name: 'UUID',
              typeGroup: 'Class',
              typeName: 'UUID',
              parameters: [],
              isNullable: false,
              isGetAccessor: false,
              type: UUID,
            },
          ],
          isNullable: false,
          isGetAccessor: false,
        },
        dependencies: [],
      }

      const targetTypes = {
        CreateNote: {
          class: CreateNote,
          properties: [], // No properties to avoid metadata error
          methods: [handleMethodMetadata],
        },
      }

      const resolver = stub().returns(() => {})

      const generator = new GraphQLHandledFieldsGenerator(
        targetTypes as any,
        typeInformer,
        resolver,
        config
      )

      const fields = generator.generateFields()

      expect(fields).to.have.property('CreateNote')
      // The type should be ID (GraphQL representation of UUID), not Boolean
      const returnType = fields.CreateNote.type
      // ID! is the non-null version of ID, which is correct for non-nullable return types
      expect(returnType.toString()).to.include('ID')
    })

    it('should use String return type from metadata', () => {
      const config = new MagekConfig('test')
      const logger = getLogger(config, 'test')
      const typeInformer = new GraphQLTypeInformer(logger)

      class CreateMessage {}

      // Create handle method metadata as it would be set by @returns(type => String)
      const handleMethodMetadata: PropertyMetadata = {
        name: 'handle',
        typeInfo: {
          name: 'Promise<string>',
          typeGroup: 'Class',
          typeName: 'Promise',
          parameters: [
            {
              name: 'string',
              typeGroup: 'String',
              typeName: 'String',
              parameters: [],
              isNullable: false,
              isGetAccessor: false,
              type: String,
            },
          ],
          isNullable: false,
          isGetAccessor: false,
        },
        dependencies: [],
      }

      const targetTypes = {
        CreateMessage: {
          class: CreateMessage,
          properties: [], // No properties to avoid metadata error
          methods: [handleMethodMetadata],
        },
      }

      const resolver = stub().returns(() => {})

      const generator = new GraphQLHandledFieldsGenerator(
        targetTypes as any,
        typeInformer,
        resolver,
        config
      )

      const fields = generator.generateFields()

      expect(fields).to.have.property('CreateMessage')
      const returnType = fields.CreateMessage.type
      // String! is the non-null version of String
      expect(returnType.toString()).to.include('String')
    })

    it('should default to Boolean when no handle method metadata is present', () => {
      const config = new MagekConfig('test')
      const logger = getLogger(config, 'test')
      const typeInformer = new GraphQLTypeInformer(logger)

      class CreateItem {}

      const targetTypes = {
        CreateItem: {
          class: CreateItem,
          properties: [],
          methods: [], // No handle method metadata
        },
      }

      const resolver = stub().returns(() => {})

      const generator = new GraphQLHandledFieldsGenerator(
        targetTypes as any,
        typeInformer,
        resolver,
        config
      )

      const fields = generator.generateFields()

      expect(fields).to.have.property('CreateItem')
      const returnType = fields.CreateItem.type
      // Boolean! is the non-null version of Boolean
      expect(returnType.toString()).to.include('Boolean')
    })
  })
})
