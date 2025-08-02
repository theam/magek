import { expect } from 'chai'
import { Magek, Role } from '../../src'

describe('the `Role` decorator', () => {
  afterEach(() => {
    for (const roleName in Magek.config.roles) {
      delete Magek.config.roles[roleName]
    }
  })

  context('when no auth metadata is provided', () => {
    it('registers a role in the Magek configuration', () => {
      @Role({ auth: {} })
      class SomeRole {}

      expect(Magek.config.roles[SomeRole.name]).to.deep.equal({ auth: {} })
    })
  })

  context('when auth metadata is provided', () => {
    it('registers a role in the Magek configuration and sets the auth metadata', () => {
      @Role({ auth: { signUpMethods: ['email', 'phone'], skipConfirmation: true } })
      class SomeRole {}

      expect(Magek.config.roles[SomeRole.name]).to.deep.equal({
        auth: { signUpMethods: ['email', 'phone'], skipConfirmation: true },
      })
    })
  })
})
