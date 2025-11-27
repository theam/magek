import { expect } from '../expect.ts'
import { restore, fake, replace } from 'sinon'
import * as Clean from '../../src/commands/clean.ts'
import * as configService from '../../src/services/config-service.ts'
import * as projectChecker from '../../src/services/project-checker.ts'
import { oraLogger } from '../../src/services/logger.ts'
import { Config } from '@oclif/core'

const projectCheckerInstance = projectChecker.projectChecker
const configServiceInstance = configService.configService

describe('clean', () => {
  describe('Clean class', () => {
    beforeEach(() => {
      replace(configServiceInstance, 'cleanProject', fake.resolves({}))
      replace(projectCheckerInstance, 'checkCurrentDirIsAMagekProject', fake.resolves({}))
      replace(projectCheckerInstance, 'checkCurrentDirMagekVersion', fake.resolves({}))
      replace(oraLogger, 'info', fake.resolves({}))
      replace(oraLogger, 'start', fake.resolves({}))
    })

    afterEach(() => {
      restore()
    })

    it('init calls checkCurrentDirMagekVersion', async () => {
      await new Clean.default([], {} as Config).init()
      expect(projectCheckerInstance.checkCurrentDirMagekVersion).to.have.been.called
    })

    it('runs the command', async () => {
      await new Clean.default([], {} as Config).run()
      expect(projectCheckerInstance.checkCurrentDirIsAMagekProject).to.have.been.called
      expect(configServiceInstance.cleanProject).to.have.been.called
      expect(oraLogger.start).to.have.been.calledWithMatch('Checking project structure')
      expect(oraLogger.start).to.have.been.calledWithMatch('Cleaning project')
      expect(oraLogger.info).to.have.been.calledWithMatch('Clean complete!')
    })
  })
})
