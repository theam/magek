import { expect } from '../expect'
import { Register } from '@magek/common'
import { field } from '../../src'
import { Query } from '../../src/decorators'
import { Magek } from '../../src'
import { fake } from 'sinon'
import { MagekAuthorizer } from '../../src/authorizer'

describe('the `Query` decorator', () => {
  afterEach(() => {
    const magek = Magek as any
    delete magek.config.queryHandlers['GetComments']
    delete magek.config.queryHandlers['ListNotes']
  })

  context('when an authorizer function is provided', () => {
    it('injects the query handler metadata in the Magek configuration with the provided authorizer function', () => {
      const fakeQueryAuthorizer = fake.resolves(undefined)
      @Query({ authorize: fakeQueryAuthorizer })
      class GetComments {
        @field((type) => String)
        public readonly postId!: string

        public static async handle(_query: GetComments, _register: Register): Promise<void> {
          throw new Error('Not implemented')
        }
      }

      // Make Magek be of any type to access private members
      const magek = Magek as any
      const queryMetadata = magek.config.queryHandlers[GetComments.name]

      expect(queryMetadata).to.be.an('object')
      expect(queryMetadata.class).to.equal(GetComments)
      expect(queryMetadata.properties[0].name).to.equal('postId')
      expect(queryMetadata.properties[0].typeInfo.name).to.equal('string')
      // Note: static methods like 'handle' are not included in methods metadata
      // since they're not decorated with @field() - methods contains getters only
      expect(queryMetadata.methods).to.be.an('Array')
      expect(queryMetadata.authorizer).to.equal(fakeQueryAuthorizer)
      expect(queryMetadata.before).to.be.an('Array')
      expect(queryMetadata.before).to.be.empty
    })
  })

  context('when an authorizer function is not provided', () => {
    it('injects the query handler metadata in the Magek configuration and denies access', () => {
      @Query({})
      class GetComments {
        @field((type) => String)
        public readonly postId!: string

        public static async handle(_query: GetComments, _register: Register): Promise<void> {
          throw new Error('Not implemented')
        }
      }

      // Make Magek be of any type to access private members
      const magek = Magek as any
      const queryMetadata = magek.config.queryHandlers[GetComments.name]

      expect(queryMetadata).to.be.an('object')
      expect(queryMetadata.class).to.equal(GetComments)
      expect(queryMetadata.properties[0].name).to.equal('postId')
      expect(queryMetadata.properties[0].typeInfo.name).to.equal('string')
      expect(queryMetadata.methods).to.be.an('Array')
      expect(queryMetadata.authorizer).to.equal(MagekAuthorizer.denyAccess)
      expect(queryMetadata.before).to.be.an('Array')
      expect(queryMetadata.before).to.be.empty
    })
  })

  context('when a `before` hook is provided', () => {
    it('injects the query handler metadata in the Magek configuration with the provided before hook', () => {
      const fakeBeforeHook = fake.resolves(undefined)
      @Query({ before: [fakeBeforeHook] })
      class GetComments {
        @field((type) => String)
        public readonly postId!: string

        public static async handle(_query: GetComments, _register: Register): Promise<void> {
          throw new Error('Not implemented')
        }
      }

      // Make Magek be of any type to access private members
      const magek = Magek as any
      const queryMetadata = magek.config.queryHandlers[GetComments.name]

      expect(queryMetadata).to.be.an('object')
      expect(queryMetadata.class).to.equal(GetComments)
      expect(queryMetadata.properties[0].name).to.equal('postId')
      expect(queryMetadata.properties[0].typeInfo.name).to.equal('string')
      expect(queryMetadata.methods).to.be.an('Array')
      expect(queryMetadata.authorizer).to.equal(MagekAuthorizer.denyAccess)
      expect(queryMetadata.before).to.be.an('Array')
      expect(queryMetadata.before).to.include(fakeBeforeHook)
    })
  })

  context('when the query has no fields', () => {
    it('injects the query handler metadata without requiring @field() decorators', () => {
      @Query({ authorize: 'all' })
      class ListNotes {
        public static async handle(_query: ListNotes, _register: Register): Promise<void> {
          throw new Error('Not implemented')
        }
      }

      // Make Magek be of any type to access private members
      const magek = Magek as any
      const queryMetadata = magek.config.queryHandlers[ListNotes.name]

      expect(queryMetadata).to.be.an('object')
      expect(queryMetadata.class).to.equal(ListNotes)
      expect(queryMetadata.properties).to.be.an('Array')
      expect(queryMetadata.properties).to.be.empty
      expect(queryMetadata.methods).to.be.an('Array')
      expect(queryMetadata.methods).to.be.empty
      expect(queryMetadata.authorizer).not.to.equal(MagekAuthorizer.denyAccess)
      expect(queryMetadata.before).to.be.an('Array')
      expect(queryMetadata.before).to.be.empty
    })
  })
})
