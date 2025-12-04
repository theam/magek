import { initializeEnvironment, currentEnvironment } from '../../src/services/environment.js'
import { logger } from '../../src/services/logger.js'
import { restore, replace, fake } from 'sinon'
import { expect } from '../expect.js'

describe('environment service', (): void => {
  let formerValue: string | undefined

  beforeEach(() => {
    if (process.env.MAGEK_ENV !== undefined) {
      formerValue = process.env.MAGEK_ENV
    }
    delete process.env.MAGEK_ENV
  })

  afterEach(() => {
    process.env.MAGEK_ENV = formerValue
    restore()
  })

  describe('currentEnvironment', (): void => {
    it('get current environment: testing', async () => {
      process.env.MAGEK_ENV = 'testing'
      expect(currentEnvironment()).to.be.equal('testing')
    })

    it('get current environment: undefined', async () => {
      expect(currentEnvironment()).to.be.undefined
    })
  })

  describe('initializeEnvironment', (): void => {
    beforeEach(() => {
      replace(logger, 'error', fake.resolves({}))
    })
    const logMessage = /No environment set/

    describe('process.env.MAGEK_ENV set', (): void => {
      beforeEach(() => {
        process.env.MAGEK_ENV = 'testing'
      })

      it('set environment in param: no log message', async () => {
        initializeEnvironment(logger, 'production')
        expect(logger.error).to.not.have.been.calledWithMatch(logMessage)
        expect(process.env.MAGEK_ENV).to.be.equal('production')
      })

      it('do not pass environment as param: no log message', async () => {
        initializeEnvironment(logger)
        expect(logger.error).to.not.have.been.calledWithMatch(logMessage)
        expect(process.env.MAGEK_ENV).to.be.equal('testing')
      })
    })

    describe('process.env.MAGEK_ENV not set', (): void => {
      it('set environment only in param: no log message', async () => {
        initializeEnvironment(logger, 'production')
        expect(logger.error).to.not.have.been.calledWithMatch(logMessage)
        expect(process.env.MAGEK_ENV).to.be.equal('production')
      })

      it('environment not set as param: log message', async () => {
        initializeEnvironment(logger)
        expect(logger.error).to.have.been.calledWithMatch(logMessage)
        expect(process.env.MAGEK_ENV).to.be.undefined
      })
    })
  })
})
