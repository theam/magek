import { expect } from '../expect.js'
import { restore, fake, replace } from 'sinon'
import * as Build from '../../src/commands/build.js'
import * as configService from '../../src/services/config-service.js'
import * as projectChecker from '../../src/services/project-checker.js'
import { oraLogger } from '../../src/services/logger.js'
import { Config } from '@oclif/core'

const projectCheckerInstance = projectChecker.projectChecker
const configServiceInstance = configService.configService

describe('build', () => {
  describe('Build class', () => {
    beforeEach(() => {
      replace(configServiceInstance, 'compileProject', fake.resolves({}))
      replace(projectCheckerInstance, 'checkCurrentDirIsAMagekProject', fake.resolves({}))
      replace(projectCheckerInstance, 'checkCurrentDirMagekVersion', fake.resolves({}))
      replace(oraLogger, 'info', fake.resolves({}))
      replace(oraLogger, 'start', fake.resolves({}))
    })

    afterEach(() => {
      restore()
    })

    it('init calls checkCurrentDirMagekVersion', async () => {
      await new Build.default([], {} as Config).init()
      expect(projectCheckerInstance.checkCurrentDirMagekVersion).to.have.been.called
    })

    it('runs the command', async () => {
      await new Build.default([], {} as Config).run()
      expect(projectCheckerInstance.checkCurrentDirIsAMagekProject).to.have.been.called
      expect(configServiceInstance.compileProject).to.have.been.called
      expect(oraLogger.start).to.have.been.calledWithMatch('Checking project structure')
      expect(oraLogger.start).to.have.been.calledWithMatch('Building project')
      expect(oraLogger.info).to.have.been.calledWithMatch('Build complete!')
    })
  })
})
