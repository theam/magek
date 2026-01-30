/**
 * Tests for field metadata storage using Symbol.metadata (TC39 Stage 3 decorators).
 *
 * These tests verify that:
 * 1. @field decorator stores metadata in context.metadata
 * 2. Symbol.metadata on the class contains the field metadata after class definition
 * 3. buildClassMetadataFromFields correctly reads from Symbol.metadata
 * 4. @calculatedField stores dependencies in Symbol.metadata
 * 5. @sequencedBy stores sequence key in Symbol.metadata
 */

import { expect } from '../expect'
import { field, calculatedField, sequencedBy, ReadModel, Command, Entity, Event, Query } from '../../src/decorators'
import { buildClassMetadataFromFields } from '../../src/decorators/field-metadata-reader'
import { FIELDS_METADATA_KEY, SYMBOL_METADATA, DecoratorMetadataObject } from '../../src/decorators/decorator-types'
import { CALCULATED_FIELDS_SYMBOL } from '../../src/decorators/read-model'
import { SEQUENCE_KEY_SYMBOL } from '../../src/decorators/sequenced-by'
import { Magek } from '../../src/magek'
import { UUID } from '@magek/common'

describe('Symbol.metadata storage for decorators', () => {
  afterEach(() => {
    Magek.configure('test', (config) => {
      // Clean up registered entities
      for (const key in config.events) delete config.events[key]
      for (const key in config.entities) delete config.entities[key]
      for (const key in config.commandHandlers) delete config.commandHandlers[key]
      for (const key in config.queryHandlers) delete config.queryHandlers[key]
      for (const key in config.readModels) delete config.readModels[key]
      for (const key in config.readModelSequenceKeys) delete config.readModelSequenceKeys[key]
    })
  })

  describe('@field decorator', () => {
    it('stores field metadata in Symbol.metadata on the class', () => {
      class TestClass {
        @field()
        public name!: string

        @field()
        public age!: number
      }

      const classRecord = TestClass as unknown as Record<symbol, DecoratorMetadataObject | undefined>
      const metadata = classRecord[SYMBOL_METADATA]

      expect(metadata).to.exist
      expect(metadata![FIELDS_METADATA_KEY]).to.be.an('array')

      const fields = metadata![FIELDS_METADATA_KEY] as Array<{ name: string }>
      expect(fields).to.have.lengthOf(2)
      expect(fields.map((f) => f.name)).to.include.members(['name', 'age'])
    })

    it('stores type function when provided', () => {
      class TestClass {
        @field((type) => String)
        public name!: string

        @field((type) => Number)
        public count!: number

        @field((type) => [String])
        public tags!: string[]
      }

      const classRecord = TestClass as unknown as Record<symbol, DecoratorMetadataObject | undefined>
      const metadata = classRecord[SYMBOL_METADATA]
      const fields = metadata![FIELDS_METADATA_KEY] as Array<{ name: string; typeFunction?: () => unknown }>

      const nameField = fields.find((f) => f.name === 'name')
      expect(nameField?.typeFunction).to.be.a('function')
      expect(nameField?.typeFunction!()).to.equal(String)

      const countField = fields.find((f) => f.name === 'count')
      expect(countField?.typeFunction!()).to.equal(Number)

      const tagsField = fields.find((f) => f.name === 'tags')
      expect(tagsField?.typeFunction!()).to.deep.equal([String])
    })

    it('stores field options when provided', () => {
      class TestClass {
        @field({ nullable: true })
        public optionalField!: string | null
      }

      const classRecord = TestClass as unknown as Record<symbol, DecoratorMetadataObject | undefined>
      const metadata = classRecord[SYMBOL_METADATA]
      const fields = metadata![FIELDS_METADATA_KEY] as Array<{ name: string; options: { nullable?: boolean } }>

      const optionalFieldMeta = fields.find((f) => f.name === 'optionalField')
      expect(optionalFieldMeta?.options.nullable).to.be.true
    })
  })

  describe('buildClassMetadataFromFields', () => {
    it('reads fields from Symbol.metadata', () => {
      class TestClass {
        @field((type) => String)
        public title!: string

        @field((type) => Number)
        public count!: number
      }

      const metadata = buildClassMetadataFromFields(TestClass)

      expect(metadata.name).to.equal('TestClass')
      expect(metadata.type).to.equal(TestClass)
      expect(metadata.fields).to.have.lengthOf(2)

      const titleField = metadata.fields.find((f) => f.name === 'title')
      expect(titleField).to.exist
      expect(titleField!.typeInfo.typeGroup).to.equal('String')

      const countField = metadata.fields.find((f) => f.name === 'count')
      expect(countField).to.exist
      expect(countField!.typeInfo.typeGroup).to.equal('Number')
    })

    it('returns empty fields array when no fields are decorated', () => {
      class EmptyClass {
        public undecorated!: string
      }

      const metadata = buildClassMetadataFromFields(EmptyClass)

      expect(metadata.fields).to.deep.equal([])
      expect(metadata.methods).to.deep.equal([])
    })

    it('handles array types correctly', () => {
      class TestClass {
        @field((type) => [String])
        public tags!: string[]
      }

      const metadata = buildClassMetadataFromFields(TestClass)
      const tagsField = metadata.fields.find((f) => f.name === 'tags')

      expect(tagsField).to.exist
      expect(tagsField!.typeInfo.typeGroup).to.equal('Array')
      expect(tagsField!.typeInfo.parameters).to.have.lengthOf(1)
      expect(tagsField!.typeInfo.parameters[0].typeGroup).to.equal('String')
    })

    it('handles class types correctly', () => {
      class CustomType {
        value!: string
      }

      class TestClass {
        @field((type) => CustomType)
        public custom!: CustomType
      }

      const metadata = buildClassMetadataFromFields(TestClass)
      const customField = metadata.fields.find((f) => f.name === 'custom')

      expect(customField).to.exist
      expect(customField!.typeInfo.typeGroup).to.equal('Class')
      expect(customField!.typeInfo.type).to.equal(CustomType)
    })
  })

  describe('@calculatedField decorator', () => {
    it('stores dependencies in Symbol.metadata', () => {
      class TestClass {
        @field((type) => String)
        public firstName!: string

        @field((type) => String)
        public lastName!: string

        @calculatedField({ dependsOn: ['firstName', 'lastName'] })
        public get fullName(): string {
          return `${this.firstName} ${this.lastName}`
        }
      }

      const classRecord = TestClass as unknown as Record<symbol, DecoratorMetadataObject | undefined>
      const metadata = classRecord[SYMBOL_METADATA]

      expect(metadata).to.exist
      expect(metadata![CALCULATED_FIELDS_SYMBOL]).to.be.an('object')

      const calculatedFields = metadata![CALCULATED_FIELDS_SYMBOL] as Record<string, string[]>
      expect(calculatedFields['fullName']).to.deep.equal(['firstName', 'lastName'])
    })

    it('is read correctly by buildClassMetadataFromFields', () => {
      class TestClass {
        @field((type) => String)
        public a!: string

        @field((type) => String)
        public b!: string

        @calculatedField({ dependsOn: ['a', 'b'] })
        public get combined(): string {
          return `${this.a} ${this.b}`
        }
      }

      const metadata = buildClassMetadataFromFields(TestClass)

      expect(metadata.methods).to.have.lengthOf(1)
      expect(metadata.methods[0].name).to.equal('combined')
      expect(metadata.methods[0].dependencies).to.deep.equal(['a', 'b'])
      expect(metadata.methods[0].typeInfo.isGetAccessor).to.be.true
    })
  })

  describe('@sequencedBy decorator', () => {
    it('stores sequence key in Symbol.metadata', () => {
      class TestClass {
        @field((type) => UUID)
        public id!: UUID

        @sequencedBy
        @field((type) => String)
        public timestamp!: string
      }

      const classRecord = TestClass as unknown as Record<symbol, DecoratorMetadataObject | undefined>
      const metadata = classRecord[SYMBOL_METADATA]

      expect(metadata).to.exist
      expect(metadata![SEQUENCE_KEY_SYMBOL]).to.equal('timestamp')
    })

    it('is read by @ReadModel decorator from Symbol.metadata', () => {
      @ReadModel({ authorize: 'all' })
      class SequencedModel {
        @field((type) => UUID)
        public id!: UUID

        @sequencedBy
        @field((type) => String)
        public createdAt!: string
      }

      expect(Magek.config.readModelSequenceKeys['SequencedModel']).to.equal('createdAt')
      // Use the class to avoid unused variable warning
      expect(SequencedModel).to.exist
    })
  })

  describe('class decorators reading from Symbol.metadata', () => {
    it('@Command reads field metadata from Symbol.metadata', () => {
      @Command({ authorize: 'all' })
      class CreateItem {
        @field((type) => String)
        public name!: string

        @field((type) => Number)
        public quantity!: number

        public static async handle(): Promise<void> {}
      }

      const commandConfig = Magek.config.commandHandlers['CreateItem']
      expect(commandConfig).to.exist
      expect(commandConfig.properties).to.have.lengthOf(2)
      expect(commandConfig.properties.map((p) => p.name)).to.include.members(['name', 'quantity'])
      // Use the class to avoid unused variable warning
      expect(CreateItem).to.exist
    })

    it('@Query reads field metadata from Symbol.metadata', () => {
      @Query({ authorize: 'all' })
      class GetItems {
        @field((type) => String)
        public filter!: string

        public static async handle(): Promise<void> {}
      }

      const queryConfig = Magek.config.queryHandlers['GetItems']
      expect(queryConfig).to.exist
      expect(queryConfig.properties).to.have.lengthOf(1)
      expect(queryConfig.properties[0].name).to.equal('filter')
      // Use the class to avoid unused variable warning
      expect(GetItems).to.exist
    })

    it('@ReadModel reads field metadata from Symbol.metadata', () => {
      @ReadModel({ authorize: 'all' })
      class ItemView {
        @field((type) => UUID)
        public id!: UUID

        @field((type) => String)
        public name!: string

        @field((type) => Number)
        public price!: number
      }

      const readModelConfig = Magek.config.readModels['ItemView']
      expect(readModelConfig).to.exist
      expect(readModelConfig.properties).to.have.lengthOf(3)

      const propNames = readModelConfig.properties.map((p) => p.name)
      expect(propNames).to.include.members(['id', 'name', 'price'])
      // Use the class to avoid unused variable warning
      expect(ItemView).to.exist
    })

    it('@Event registers event correctly with field metadata', () => {
      @Event
      class ItemCreated {
        @field((type) => String)
        public itemId!: string

        @field((type) => String)
        public name!: string

        public entityID(): UUID {
          return this.itemId
        }
      }

      expect(Magek.config.events['ItemCreated']).to.exist
      expect(Magek.config.events['ItemCreated'].class).to.equal(ItemCreated)
    })

    it('@Entity registers entity correctly with field metadata', () => {
      @Entity
      class Item {
        @field((type) => UUID)
        public id!: UUID

        @field((type) => String)
        public name!: string
      }

      expect(Magek.config.entities['Item']).to.exist
      expect(Magek.config.entities['Item'].class).to.equal(Item)
    })
  })
})
