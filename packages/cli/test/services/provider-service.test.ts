import { afterEach, describe } from 'mocha'
import * as providerService from '../../src/services/provider-service'
import { restore, fake } from 'sinon'
import { expect } from '../expect'
import { faker } from '@faker-js/faker'

describe('providerService', () => {
  afterEach(() => {
    restore()
  })

  describe('assertNameIsCorrect', () => {
    it('should throw an error on surpassing project name max length', () => {
      const inputString = faker.random.alphaNumeric(faker.datatype.number({ min: 38 }))
      const errorString = `Project name cannot be longer than 37 characters:\n\n    Found: '${inputString}'`

      expect(() => providerService.assertNameIsCorrect(inputString)).to.throw(errorString)
    })

    it('should throw an error if project name includes a space', () => {
      const inputString = faker.lorem.words(2)
      const errorString = `Project name cannot contain spaces:\n\n    Found: '${inputString}'`

      expect(() => providerService.assertNameIsCorrect(inputString)).to.throw(errorString)
    })

    it('should throw an error if project name includes an uppercase letter', () => {
      const inputString = faker.random.alphaNumeric(37).toUpperCase()
      const errorString = `Project name cannot contain uppercase letters:\n\n    Found: '${inputString}'`

      expect(() => providerService.assertNameIsCorrect(inputString)).to.throw(errorString)
    })

    it('should throw an error if project name includes an underscore', () => {
      const inputString = 'test_project_name'
      const errorString = `Project name cannot contain underscore:\n\n    Found: '${inputString}'`

      expect(() => providerService.assertNameIsCorrect(inputString)).to.throw(errorString)
    })

    it('should not throw an error if project name is correct', () => {
      const inputString = faker.random.alphaNumeric(37)

      expect(() => providerService.assertNameIsCorrect(inputString)).to.not.throw()
    })
  })

  describe.skip('deployToCloudProvider', () => {})

  describe('startProvider', () => {
    context('when the configured provider implements the run function', () => {
      it('calls the provider start method', async () => {
        const fakeInfrastructure = {
          start: fake(),
        }

        const fakeProvider = {
          infrastructure: fake.returns(fakeInfrastructure),
        }

        const fakeConfig = {
          appName: 'lolapp',
          provider: fakeProvider,
           
        } as any

        await providerService.startProvider(3000, fakeConfig)

        expect(fakeInfrastructure.start).to.have.been.calledOnceWith(fakeConfig)
      })
    })

    context('when the configured provider does not implement the start function', () => {
      it('throws an error', async () => {
        const fakeProvider = {
          infrastructure: fake.returns({}),
        }

        const fakeConfig = {
          appName: 'lolapp',
          provider: fakeProvider,
           
        } as any

        await expect(providerService.startProvider(3000, fakeConfig)).to.eventually.be.rejectedWith(
          "Attempted to perform the 'start' operation with a provider that does not support this feature, please check your environment configuration."
        )
      })
    })
  })

  describe.skip('nukeCloudProviderResources', () => {})
})
