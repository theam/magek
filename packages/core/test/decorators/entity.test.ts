 
 
 
import { expect } from '../expect'
import { Event, Entity, reduces, Role } from '../../src/decorators/'
import { Magek } from '../../src'
import { UserEnvelope, UUID } from '@magek/common'
import { field } from '../../src'
import { MagekAuthorizer } from '@magek/common'
import { fake, replace } from 'sinon'

describe('the `Entity` decorator', () => {
  afterEach(() => {
    Magek.configure('test', (config) => {
      config.appName = ''
      for (const propName in config.registry.reducers) {
        delete config.registry.reducers[propName]
      }
      for (const propName in config.registry.entities) {
        delete config.registry.entities[propName]
      }
      for (const propName in config.registry.roles) {
        delete config.registry.roles[propName]
      }
    })
  })

  context('when no parameters are provided', () => {
    it('injects the entity metadata and sets up the reducers in the Magek config denying event reads', () => {
      @Event
      class CommentPosted {
        @field()
        public readonly foo!: string

        public entityID(): UUID {
          return '123'
        }
      }

      @Entity
      class Comment {
        @field(type => UUID)
        public readonly id!: UUID

        @field()
        public readonly content!: string

        @reduces(CommentPosted)
        public static react(_event: CommentPosted): Comment {
          throw new Error('Not implemented')
        }
      }

      expect(Magek.config.registry.entities['Comment'].class).to.be.equal(Comment)
      expect(Magek.config.registry.entities['Comment'].eventStreamAuthorizer).to.be.equal(MagekAuthorizer.denyAccess)

      expect(Magek.config.registry.reducers['CommentPosted']).to.deep.include({
        class: Comment,
        methodName: 'react',
      })
    })
  })

  context("when `authorizeRoleAccess` is set to 'all'", () => {
    it('injects the entity metadata and sets up the reducers in the Magek config allowing event reads', () => {
      @Entity({
        authorizeReadEvents: 'all',
      })
      class Comment {
        @field(type => UUID)
        public readonly id!: UUID

        @field()
        public readonly content!: string
      }

      expect(Magek.config.registry.entities['Comment']).to.deep.equal({
        class: Comment,
        eventStreamAuthorizer: MagekAuthorizer.allowAccess,
      })
    })
  })

  context('when `authorizeRoleAccess` is set to an array of roles', () => {
    it('injects the entity metadata and sets up the reducers in the Magek config allowing event reads to the specified roles', async () => {
      const fakeAuthorizeRoles = fake()
      replace(MagekAuthorizer, 'authorizeRoles', fakeAuthorizeRoles)

      @Role({
        auth: {},
      })
      class Manager {}

      @Entity({
        authorizeReadEvents: [Manager],
      })
      class User {
        @field(type => UUID)
        public readonly id!: UUID

        @field()
        public readonly content!: string
      }

      expect(Magek.config.registry.entities['User'].class).to.be.equal(User)
      const fakeUserEnvelope = {
        username: 'asdf',
      } as UserEnvelope
      await Magek.config.registry.entities['User'].eventStreamAuthorizer(fakeUserEnvelope)
      expect(fakeAuthorizeRoles).to.have.been.calledWithMatch([Manager], fakeUserEnvelope)
    })
  })

  context('when `authorizeRoleAccess` is set to a function', () => {
    it('injects the entity metadata and sets up the reducers in the Magek config allowing event reads to tokens that fulfill the authorizer function', async () => {
      @Entity({
        authorizeReadEvents: (currentUser?: UserEnvelope): Promise<void> => {
          if (currentUser?.username !== 'asdf') return Promise.reject('Unauthorized')
          return Promise.resolve()
        },
      })
      class User {
        @field(type => UUID)
        public readonly id!: UUID

        @field()
        public readonly content!: string
      }

      expect(Magek.config.registry.entities['User'].class).to.be.equal(User)
      const fakeUserEnvelope = {
        username: 'asdf',
      } as UserEnvelope
      await expect(Magek.config.registry.entities['User'].eventStreamAuthorizer(fakeUserEnvelope)).to.be.fulfilled

      const fakeUserEnvelope2 = {
        username: 'qwer',
      } as UserEnvelope
      await expect(Magek.config.registry.entities['User'].eventStreamAuthorizer(fakeUserEnvelope2)).to.be.rejected
    })
  })
})
