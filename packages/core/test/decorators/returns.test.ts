import { expect } from '../expect'
import { Register, UUID } from '@magek/common'
import { field, returns } from '../../src'
import { Command } from '../../src/decorators'
import { Magek } from '../../src'
import { fake } from 'sinon'

describe('the `returns` decorator', () => {
  afterEach(() => {
    const magek = Magek as any
    delete magek.config.commandHandlers['CreateNote']
    delete magek.config.commandHandlers['GetNotes']
    delete magek.config.commandHandlers['ProcessItems']
  })

  context('when used with @Command', () => {
    it('should capture UUID return type in command metadata', () => {
      @Command({ authorize: 'all' })
      class CreateNote {
        @field((type) => String)
        public readonly title!: string

        @returns((type) => UUID)
        public static async handle(_command: CreateNote, _register: Register): Promise<UUID> {
          return UUID.generate()
        }
      }

      const magek = Magek as any
      const commandMetadata = magek.config.commandHandlers[CreateNote.name]

      expect(commandMetadata).to.be.an('object')
      expect(commandMetadata.methods).to.be.an('Array')
      
      const handleMethod = commandMetadata.methods.find((m: any) => m.name === 'handle')
      expect(handleMethod).to.exist
      expect(handleMethod.typeInfo).to.exist
      // The return type should be the GraphQL type directly (UUID), not wrapped in Promise
      expect(handleMethod.typeInfo.typeName).to.equal('UUID')
      expect(handleMethod.typeInfo.typeGroup).to.equal('Class')
    })

    it('should capture String return type in command metadata', () => {
      @Command({ authorize: 'all' })
      class CreateNote {
        @field((type) => String)
        public readonly title!: string

        @returns((type) => String)
        public static async handle(_command: CreateNote, _register: Register): Promise<string> {
          return 'success'
        }
      }

      const magek = Magek as any
      const commandMetadata = magek.config.commandHandlers[CreateNote.name]

      const handleMethod = commandMetadata.methods.find((m: any) => m.name === 'handle')
      expect(handleMethod).to.exist
      // The return type should be the GraphQL type directly (String), not wrapped in Promise
      expect(handleMethod.typeInfo.typeName).to.equal('String')
      expect(handleMethod.typeInfo.typeGroup).to.equal('String')
    })

    it('should capture Number return type in command metadata', () => {
      @Command({ authorize: 'all' })
      class CreateNote {
        @field((type) => String)
        public readonly title!: string

        @returns((type) => Number)
        public static async handle(_command: CreateNote, _register: Register): Promise<number> {
          return 42
        }
      }

      const magek = Magek as any
      const commandMetadata = magek.config.commandHandlers[CreateNote.name]

      const handleMethod = commandMetadata.methods.find((m: any) => m.name === 'handle')
      expect(handleMethod).to.exist
      // The return type should be the GraphQL type directly (Number), not wrapped in Promise
      expect(handleMethod.typeInfo.typeName).to.equal('Number')
      expect(handleMethod.typeInfo.typeGroup).to.equal('Number')
    })

    it('should capture Boolean return type in command metadata', () => {
      @Command({ authorize: 'all' })
      class CreateNote {
        @field((type) => String)
        public readonly title!: string

        @returns((type) => Boolean)
        public static async handle(_command: CreateNote, _register: Register): Promise<boolean> {
          return true
        }
      }

      const magek = Magek as any
      const commandMetadata = magek.config.commandHandlers[CreateNote.name]

      const handleMethod = commandMetadata.methods.find((m: any) => m.name === 'handle')
      expect(handleMethod).to.exist
      // The return type should be the GraphQL type directly (Boolean), not wrapped in Promise
      expect(handleMethod.typeInfo.typeName).to.equal('Boolean')
      expect(handleMethod.typeInfo.typeGroup).to.equal('Boolean')
    })

    it('should capture Array return type in command metadata', () => {
      class CartItem {
        id!: string
        name!: string
      }

      @Command({ authorize: 'all' })
      class GetNotes {
        @returns((type) => [CartItem])
        public static async handle(_command: GetNotes, _register: Register): Promise<CartItem[]> {
          return []
        }
      }

      const magek = Magek as any
      const commandMetadata = magek.config.commandHandlers[GetNotes.name]

      const handleMethod = commandMetadata.methods.find((m: any) => m.name === 'handle')
      expect(handleMethod).to.exist
      // The return type should be the GraphQL type directly (Array), not wrapped in Promise
      expect(handleMethod.typeInfo.typeGroup).to.equal('Array')
      expect(handleMethod.typeInfo.parameters[0].typeName).to.equal('CartItem')
    })

    it('should capture custom class return type in command metadata', () => {
      class CustomResult {
        success!: boolean
        message!: string
      }

      @Command({ authorize: 'all' })
      class ProcessItems {
        @returns((type) => CustomResult)
        public static async handle(_command: ProcessItems, _register: Register): Promise<CustomResult> {
          return { success: true, message: 'done' }
        }
      }

      const magek = Magek as any
      const commandMetadata = magek.config.commandHandlers[ProcessItems.name]

      const handleMethod = commandMetadata.methods.find((m: any) => m.name === 'handle')
      expect(handleMethod).to.exist
      // The return type should be the GraphQL type directly (CustomResult), not wrapped in Promise
      expect(handleMethod.typeInfo.typeName).to.equal('CustomResult')
      expect(handleMethod.typeInfo.typeGroup).to.equal('Class')
    })
  })

  context('when @returns is not used', () => {
    it('should not add handle method to metadata', () => {
      const fakeCommandAuthorizer = fake.resolves(undefined)
      @Command({ authorize: fakeCommandAuthorizer })
      class CreateNote {
        @field((type) => String)
        public readonly title!: string

        public static async handle(_command: CreateNote, _register: Register): Promise<void> {
          // no @returns decorator
        }
      }

      const magek = Magek as any
      const commandMetadata = magek.config.commandHandlers[CreateNote.name]

      // Without @returns, the handle method should NOT be in methods array
      const handleMethod = commandMetadata.methods.find((m: any) => m.name === 'handle')
      expect(handleMethod).to.be.undefined
    })
  })

  context('when invalid array type is used', () => {
    it('should throw an error for empty array type', () => {
      // We need to test the internal function directly since decorators
      // are applied at class definition time
      const { getReturnTypeMetadata, RETURNS_METADATA_KEY } = require('../../src/decorators/returns')

      // Create fake metadata with empty array type
      const fakeMetadata = {
        [RETURNS_METADATA_KEY]: [
          {
            methodName: 'handle',
            typeFunction: () => [], // Empty array - invalid!
          },
        ],
      }

      // This should throw an error
      expect(() => getReturnTypeMetadata(fakeMetadata, 'handle')).to.throw(
        '@returns decorator array type must specify an element type'
      )
    })
  })
})
