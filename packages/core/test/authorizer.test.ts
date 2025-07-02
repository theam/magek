import { expect } from './expect'
import { NotAuthorizedError, UserEnvelope } from '@booster-ai/common'

import { Authorizer } from '../src/authorizer'

describe('BoosterAuthorizer', () => {
  class Admin {}

  describe('The `allowAccess` method', () => {
    it('should return a resolved promise', async () => {
      await expect(Authorizer.allowAccess()).to.eventually.be.fulfilled
    })
  })

  describe('The `denyAccess` method', () => {
    it('should return a rejected promise', async () => {
      await expect(Authorizer.denyAccess()).to.eventually.be.rejectedWith(NotAuthorizedError)
    })
  })

  describe('The `authorizeRoles` method', () => {
    it('should return a resolved promise if the user has one of the authorized roles', async () => {
      const user = {
        roles: ['Admin', 'Developer'],
      } as unknown as UserEnvelope

      await expect(Authorizer.authorizeRoles([Admin], user)).to.eventually.be.fulfilled
    })

    it('should return a rejected promise if the user does not have any of the authorized roles', async () => {
      const user = {
        roles: ['Reader'],
      } as unknown as UserEnvelope

      await expect(Authorizer.authorizeRoles([Admin], user)).to.eventually.be.rejectedWith(NotAuthorizedError)
    })
  })
})
