import { expect } from '../expect'
import { Register, field } from '@magek/common'
import { Command } from '../../src/decorators'
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
        @field((type) => String)
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
      // Note: static methods like 'handle' are not included in methods metadata
      // since they're not decorated with @field() - methods contains getters only
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
        @field((type) => String)
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
        @field((type) => String)
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
})
