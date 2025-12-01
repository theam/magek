import { expect } from '../expect.js'
import { restore, fake, replace } from 'sinon'
import { MagekConfig, type ProviderLibrary } from '@magek/common'
import * as Start from '../../src/commands/start.js'
import * as providerService from '../../src/services/provider-service.js'
import { oraLogger } from '../../src/services/logger.js'
import { Config } from '@oclif/core'
import { runCommand } from '@oclif/test'
import * as environment from '../../src/services/environment.js'
import * as configService from '../../src/services/config-service.js'
import * as projectChecker from '../../src/services/project-checker.js'

const projectCheckerInstance = projectChecker.projectChecker
const configServiceInstance = configService.configService
const environmentInstance = environment.environmentService
const providerServiceInstance = providerService.providerService

type StartRunTasks = (
  port: number,
  loader: Promise<MagekConfig>,
  runner: (config: MagekConfig) => Promise<void>
) => Promise<void>

const runTasks: StartRunTasks = Start.runTasks

describe('start', () => {
  beforeEach(() => {
    delete process.env.MAGEK_ENV
  })

  afterEach(() => {
    restore()
  })

  describe('runTasks function', () => {
    it('calls the runner for the local server', async () => {
      const fakeProvider = {} as ProviderLibrary
      const fakeConfig = {
        provider: fakeProvider,
        appName: 'fake-app',
      }

      const fakeLoader = fake.resolves(fakeConfig)
      const fakeRunner = fake.resolves(undefined)
      replace(environmentInstance, 'currentEnvironment', fake.returns('test-env'))

      await runTasks(3000, fakeLoader() as Promise<MagekConfig>, fakeRunner)

      expect(fakeRunner).to.have.been.calledOnce
    })
  })

  describe('run', () => {
    context('when no environment provided', async () => {
      it('shows no environment provided error', async () => {
        const {stdout} = await runCommand<{name: string}>(['start'], { root: __dirname })
        expect(stdout).to.match(/No environment set/)
      })
    })
  })

  describe('start class', () => {
    beforeEach(() => {
      const config = new MagekConfig('fake_environment')
      replace(configServiceInstance, 'compileProjectAndLoadConfig', fake.resolves(config))
      replace(providerServiceInstance, 'startProvider', fake.resolves({}))
      replace(projectCheckerInstance, 'checkCurrentDirMagekVersion', fake.resolves({}))
      replace(oraLogger, 'fail', fake.resolves({}))
      replace(oraLogger, 'info', fake.resolves({}))
      replace(oraLogger, 'start', fake.resolves({}))
      replace(oraLogger, 'succeed', fake.resolves({}))
    })

    it('init calls checkCurrentDirMagekVersion', async () => {
      const config = await Config.load()
      await new Start.default([], config).init()
      expect(projectCheckerInstance.checkCurrentDirMagekVersion).to.have.been.called
    })

    it('without flags', async () => {
      const config = await Config.load()
      await new Start.default([], config).run()

      expect(configServiceInstance.compileProjectAndLoadConfig).to.have.not.been.called
      expect(providerServiceInstance.startProvider).to.have.not.been.called
      expect(oraLogger.fail).to.have.been.calledWithMatch(/No environment set/)
    })

    it('with -e flag incomplete', async () => {
      let exceptionThrown = false
      let exceptionMessage = ''
      try {
        const config = await Config.load()
        await new Start.default(['-e'], config).run()
      } catch (e) {
        exceptionThrown = true
        exceptionMessage = e.message
      }
      expect(exceptionThrown).to.be.equal(true)
      expect(exceptionMessage).to.to.contain('--environment expects a value')
      expect(configServiceInstance.compileProjectAndLoadConfig).to.have.not.been.called
      expect(providerServiceInstance.startProvider).to.have.not.been.called
    })

    it('with --environment flag incomplete', async () => {
      let exceptionThrown = false
      let exceptionMessage = ''
      try {
        const config = await Config.load()
        await new Start.default(['--environment'], config).run()
      } catch (e) {
        exceptionThrown = true
        exceptionMessage = e.message
      }
      expect(exceptionThrown).to.be.equal(true)
      expect(exceptionMessage).to.to.contain('--environment expects a value')
      expect(configServiceInstance.compileProjectAndLoadConfig).to.have.not.been.called
      expect(providerServiceInstance.startProvider).to.have.not.been.called
    })

    describe('inside a Magek project', () => {
      it('entering correct environment', async () => {
        const config = await Config.load()
        await new Start.default(['-e', 'fake_environment'], config).run()

        expect(configServiceInstance.compileProjectAndLoadConfig).to.have.been.called
        expect(providerServiceInstance.startProvider).to.have.been.called
        expect(oraLogger.start).to.have.been.calledWithMatch(/Starting debug server on port/)
      })

      it('entering correct environment and --port flag', async () => {
        const config = await Config.load()
        await new Start.default(['-e', 'fake_environment', '--port', '5000'], config).run()

        expect(configServiceInstance.compileProjectAndLoadConfig).to.have.been.called
        expect(providerServiceInstance.startProvider).to.have.been.called
        expect(oraLogger.start).to.have.been.calledWithMatch(/Starting debug server on port 5000/)
      })

      it('entering correct environment and -p flag', async () => {
        const config = await Config.load()
        await new Start.default(['-e', 'fake_environment', '-p', '5000'], config).run()

        expect(configServiceInstance.compileProjectAndLoadConfig).to.have.been.called
        expect(providerServiceInstance.startProvider).to.have.been.called
        expect(oraLogger.start).to.have.been.calledWithMatch(/Starting debug server on port 5000/)
      })

      it('entering correct environment and nonexisting flag', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Start.default(['-e', 'fake_environment', '--nonexistingoption'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Nonexistent flag: --nonexistingoption')
        expect(configServiceInstance.compileProjectAndLoadConfig).to.have.not.been.called
        expect(providerServiceInstance.startProvider).to.have.not.been.called
        expect(oraLogger.start).to.have.not.been.calledWithMatch(/Starting debug server on port/)
      })

      it('entering correct environment and --port with incomplete port number', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Start.default(['-e', 'fake_environment', '--port'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('--port expects a value')
        expect(configServiceInstance.compileProjectAndLoadConfig).to.have.not.been.called
        expect(providerServiceInstance.startProvider).to.have.not.been.called
        expect(oraLogger.start).to.have.not.been.calledWithMatch(/Starting debug server on port/)
      })

      it('entering correct environment and -p with incomplete port number', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Start.default(['-e', 'fake_environment', '-p'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('--port expects a value')
        expect(configServiceInstance.compileProjectAndLoadConfig).to.have.not.been.called
        expect(providerServiceInstance.startProvider).to.have.not.been.called
        expect(oraLogger.start).to.have.not.been.calledWithMatch(/Starting debug server on port/)
      })

      it('without defining environment and -p', async () => {
        const config = await Config.load()
        await new Start.default(['-p', '5000'], config).run()

        expect(configServiceInstance.compileProjectAndLoadConfig).to.have.not.been.called
        expect(providerServiceInstance.startProvider).to.have.not.been.called
        expect(oraLogger.fail).to.have.been.calledWithMatch(/No environment set/)
      })
    })
  })
})
