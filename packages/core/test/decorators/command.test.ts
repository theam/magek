import { expect } from '../expect'
import { Register, Field, UUID } from '@magek/common'
import { Command, Returns } from '../../src/decorators'
import { Magek } from '../../src'
import { fake } from 'sinon'
import { MagekAuthorizer } from '../../src/authorizer'

describe('the `Command` decorator', () => {
  afterEach(() => {
    const magek = Magek as any
    delete magek.config.commandHandlers['PostComment']
  })

  context('when an authorizer function is provided', () => {
    it('injects the command handler metadata in the Magek configuration with the provided authorizer function', () => {
      const fakeCommandAuthorizer = fake.resolves(undefined)
      @Command({ authorize: fakeCommandAuthorizer })
      class PostComment {
        @Field((type) => String)
        public readonly comment!: string

        public static async handle(_command: PostComment, _register: Register): Promise<void> {
          throw new Error('Not implemented')
        }
      }

      // Make Magek be of any type to access private members
      const magek = Magek as any
      const commandMetadata = magek.config.commandHandlers[PostComment.name]

      expect(commandMetadata).to.be.an('object')
      expect(commandMetadata.class).to.equal(PostComment)
      expect(commandMetadata.properties[0].name).to.equal('comment')
      expect(commandMetadata.properties[0].typeInfo.name).to.equal('string')
      // Note: static methods like 'handle' are only included in methods metadata
      // if they're decorated with @Returns() to specify their return type
      expect(commandMetadata.methods).to.be.an('Array')
      expect(commandMetadata.authorizer).to.equal(fakeCommandAuthorizer)
      expect(commandMetadata.before).to.be.an('Array')
      expect(commandMetadata.before).to.be.empty
    })
  })

  context('when an authorizer function is not provided', () => {
    it('injects the command handler metadata in the Magek configuration and denies access', () => {
      @Command({})
      class PostComment {
        @Field((type) => String)
        public readonly comment!: string

        public static async handle(_command: PostComment, _register: Register): Promise<void> {
          throw new Error('Not implemented')
        }
      }

      // Make Magek be of any type to access private members
      const magek = Magek as any
      const commandMetadata = magek.config.commandHandlers[PostComment.name]

      expect(commandMetadata).to.be.an('object')
      expect(commandMetadata.class).to.equal(PostComment)
      expect(commandMetadata.properties[0].name).to.equal('comment')
      expect(commandMetadata.properties[0].typeInfo.name).to.equal('string')
      expect(commandMetadata.methods).to.be.an('Array')
      expect(commandMetadata.authorizer).to.equal(MagekAuthorizer.denyAccess)
      expect(commandMetadata.before).to.be.an('Array')
      expect(commandMetadata.before).to.be.empty
    })
  })

  context('when a `before` hook is provided', () => {
    it('injects the command handler metadata in the Magek configuration with the provided before hook', () => {
      const fakeBeforeHook = fake.resolves(undefined)
      @Command({ before: [fakeBeforeHook] })
      class PostComment {
        @Field((type) => String)
        public readonly comment!: string

        public static async handle(_command: PostComment, _register: Register): Promise<void> {
          throw new Error('Not implemented')
        }
      }

      // Make Magek be of any type to access private members
      const magek = Magek as any
      const commandMetadata = magek.config.commandHandlers[PostComment.name]

      expect(commandMetadata).to.be.an('object')
      expect(commandMetadata.class).to.equal(PostComment)
      expect(commandMetadata.properties[0].name).to.equal('comment')
      expect(commandMetadata.properties[0].typeInfo.name).to.equal('string')
      expect(commandMetadata.methods).to.be.an('Array')
      expect(commandMetadata.authorizer).to.equal(MagekAuthorizer.denyAccess)
      expect(commandMetadata.before).to.be.an('Array')
      expect(commandMetadata.before).to.include(fakeBeforeHook)
    })
  })

  context('when using @Returns decorator', () => {
    afterEach(() => {
      const magek = Magek as any
      delete magek.config.commandHandlers['CreateNote']
      delete magek.config.commandHandlers['GetMessage']
    })

    it('injects return type metadata from @Returns decorator', () => {
      @Command({ authorize: 'all' })
      class CreateNote {
        @Field((type) => String)
        public readonly title!: string

        @Returns(() => UUID)
        public static async handle(_command: CreateNote, _register: Register): Promise<UUID> {
          return UUID.generate()
        }
      }

      // Make Magek be of any type to access private members
      const magek = Magek as any
      const commandMetadata = magek.config.commandHandlers[CreateNote.name]

      expect(commandMetadata).to.be.an('object')
      expect(commandMetadata.class).to.equal(CreateNote)
      expect(commandMetadata.methods).to.be.an('Array')
      
      // Check that the handle method metadata is present
      const handleMethod = commandMetadata.methods.find((m: any) => m.name === 'handle')
      expect(handleMethod).to.exist
      expect(handleMethod.typeInfo.typeName).to.equal('Promise')
      expect(handleMethod.typeInfo.parameters).to.have.lengthOf(1)
      expect(handleMethod.typeInfo.parameters[0].typeName).to.equal('UUID')
    })

    it('works with String return type', () => {
      @Command({ authorize: 'all' })
      class GetMessage {
        @Returns(() => String)
        public static async handle(_command: GetMessage, _register: Register): Promise<string> {
          return 'Hello, World!'
        }
      }

      const magek = Magek as any
      const commandMetadata = magek.config.commandHandlers[GetMessage.name]

      expect(commandMetadata).to.be.an('object')
      const handleMethod = commandMetadata.methods.find((m: any) => m.name === 'handle')
      expect(handleMethod).to.exist
      expect(handleMethod.typeInfo.typeName).to.equal('Promise')
      expect(handleMethod.typeInfo.parameters[0].typeName).to.equal('String')
    })
  })
})
