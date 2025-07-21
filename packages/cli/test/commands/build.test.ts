import { expect } from '../expect'
import { restore, fake, replace } from 'sinon'
import * as Build from '../../src/commands/build'
import * as configService from '../../src/services/config-service'
import * as projectChecker from '../../src/services/project-checker'
import { oraLogger } from '../../src/services/logger'
import { Config } from '@oclif/core'

describe('build', () => {
  describe('Build class', () => {
    beforeEach(() => {
      replace(configService, 'compileProject', fake.resolves({}))
      replace(projectChecker, 'checkCurrentDirIsAMagekProject', fake.resolves({}))
      replace(projectChecker, 'checkCurrentDirMagekVersion', fake.resolves({}))
      replace(oraLogger, 'info', fake.resolves({}))
      replace(oraLogger, 'start', fake.resolves({}))
    })

    afterEach(() => {
      restore()
    })

    it('init calls checkCurrentDirMagekVersion', async () => {
      await new Build.default([], {} as Config).init()
      expect(projectChecker.checkCurrentDirMagekVersion).to.have.been.called
    })

    it('runs the command', async () => {
      await new Build.default([], {} as Config).run()
      expect(projectChecker.checkCurrentDirIsAMagekProject).to.have.been.called
      expect(configService.compileProject).to.have.been.called
      expect(oraLogger.start).to.have.been.calledWithMatch('Checking project structure')
      expect(oraLogger.start).to.have.been.calledWithMatch('Building project')
      expect(oraLogger.info).to.have.been.calledWithMatch('Build complete!')
    })
  })
})
