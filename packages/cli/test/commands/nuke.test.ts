import { expect } from '../expect.ts'
import { fancy } from 'fancy-test'
import { restore, replace, fake } from 'sinon'
import Prompter from '../../src/services/user-prompt.ts'
import { MagekConfig, type ProviderLibrary } from '@magek/common'
import * as Nuke from '../../src/commands/nuke.ts'
import * as providerService from '../../src/services/provider-service.ts'
import { oraLogger } from '../../src/services/logger.ts'
import { Config } from '@oclif/core'
import { runCommand } from '@oclif/test'
import * as environment from '../../src/services/environment.ts'
import * as configService from '../../src/services/config-service.ts'
import * as projectChecker from '../../src/services/project-checker.ts'

const projectCheckerInstance = projectChecker.projectChecker
const configServiceInstance = configService.configService
const environmentInstance = environment.environmentService
const providerServiceInstance = providerService.providerService

type NukeRunTasks = (
  compileAndLoad: Promise<MagekConfig>,
  nuke: (config: MagekConfig) => Promise<void>
) => Promise<void>

type AskToConfirmRemoval = (
  prompter: Prompter,
  force: boolean,
  config: Promise<MagekConfig>
) => Promise<MagekConfig>
const runTasks: NukeRunTasks = Nuke.runTasks
const loader: AskToConfirmRemoval = Nuke.askToConfirmRemoval

describe('nuke', () => {
  beforeEach(() => {
    delete process.env.MAGEK_ENV
  })

  afterEach(() => {
    restore()
  })

  describe('runTasks function', () => {
    context('when an unexpected problem happens', () => {
      fancy.stdout().it('fails gracefully showing the error message', async () => {
        const msg = 'weird exception'
        const fakeLoader = Promise.reject(new Error(msg))
        const fakeNuke = fake.resolves(undefined)
        replace(environmentInstance, 'currentEnvironment', fake.returns('test-env'))

        await expect(runTasks(fakeLoader, fakeNuke)).to.eventually.be.rejectedWith(msg)
        expect(fakeNuke).not.to.have.been.called
      })
    })

    context('when a wrong application name is provided', () => {
      fancy.stdout().it('fails gracefully showing the error message', async () => {
        const fakeProvider = {} as ProviderLibrary

        const fakeConfig: Promise<MagekConfig> = Promise.resolve({
          provider: fakeProvider,
          appName: 'fake app',
          region: 'tunte',
          entities: {},
        } as unknown as MagekConfig)

        const prompter = new Prompter()
        const fakePrompter = fake.resolves('fake app 2') // The user entered wrong app name
        replace(prompter, 'defaultOrPrompt', fakePrompter)
        const fakeNuke = fake.resolves(undefined)
        const errorMsg = 'Wrong app name, stopping nuke!'

        replace(environmentInstance, 'currentEnvironment', fake.returns('test-env'))

        await expect(runTasks(loader(prompter, false, fakeConfig), fakeNuke)).to.eventually.be.rejectedWith(errorMsg)
        expect(fakeNuke).not.to.have.been.called
      })
    })

    context('when the --force flag is provided', () => {
      fancy.stdout().it('continues without asking for the application name', async () => {
        const fakeProvider = {} as ProviderLibrary

        const fakeConfig: Promise<MagekConfig> = Promise.resolve({
          provider: fakeProvider,
          appName: 'fake app',
          region: 'tunte',
          entities: {},
        } as unknown as MagekConfig)

        const prompter = new Prompter()
        const fakePrompter = fake.resolves('fake app 2') // The user entered wrong app name
        replace(prompter, 'defaultOrPrompt', fakePrompter)
        const fakeNuke = fake.resolves(undefined)

        replace(environmentInstance, 'currentEnvironment', fake.returns('test-env'))

        await expect(runTasks(loader(prompter, true, fakeConfig), fakeNuke)).to.eventually.be.fulfilled
        expect(prompter.defaultOrPrompt).not.to.have.been.called
        expect(fakeNuke).to.have.been.calledOnce
      })
    })

    context('when a valid application name is provided', () => {
      fancy.stdout().it('starts removal', async (ctx) => {
        const fakeProvider = {} as ProviderLibrary

        const fakeConfig: Promise<MagekConfig> = Promise.resolve({
          provider: fakeProvider,
          appName: 'fake app',
          region: 'tunte',
          entities: {},
        } as unknown as MagekConfig)

        const prompter = new Prompter()
        const fakePrompter = fake.resolves('fake app')
        replace(prompter, 'defaultOrPrompt', fakePrompter)
        const fakeNuke = fake(async (config: MagekConfig) => {
          config.logger?.info('this is a progress update')
        })

        replace(environmentInstance, 'currentEnvironment', fake.returns('test-env'))

        await runTasks(loader(prompter, false, fakeConfig), fakeNuke)

        expect(ctx.stdout).to.include('Removal complete!')
        expect(fakeNuke).to.have.been.calledOnce
      })
    })
  })

  describe('run', () => {
    context('when no environment provided', async () => {
      it('shows no environment provided error', async () => {
        const {stdout} = await runCommand<{name: string}>(['nuke'], { root: __dirname })
        expect(stdout).to.match(/No environment set/)
      })
    })
  })

  describe('command class', () => {
    beforeEach(() => {
      const config = new MagekConfig('fake_environment')
      replace(configServiceInstance, 'compileProjectAndLoadConfig', fake.resolves(config))
      replace(providerServiceInstance, 'nukeCloudProviderResources', fake.resolves({}))
      replace(projectCheckerInstance, 'checkCurrentDirMagekVersion', fake.resolves({}))
      replace(oraLogger, 'fail', fake.resolves({}))
      replace(oraLogger, 'info', fake.resolves({}))
      replace(oraLogger, 'start', fake.resolves({}))
      replace(oraLogger, 'succeed', fake.resolves({}))
    })

    it('init calls checkCurrentDirMagekVersion', async () => {
      const config = await Config.load()
      await new Nuke.default([], config).init()
      expect(projectCheckerInstance.checkCurrentDirMagekVersion).to.have.been.called
    })

    it('without flags', async () => {
      const config = await Config.load()
      await new Nuke.default([], config).run()

      expect(configServiceInstance.compileProjectAndLoadConfig).to.have.not.been.called
      expect(providerServiceInstance.nukeCloudProviderResources).to.have.not.been.called
      expect(oraLogger.fail).to.have.been.calledWithMatch(/No environment set/)
    })

    it('with -e flag incomplete', async () => {
      let exceptionThrown = false
      let exceptionMessage = ''
      try {
        const config = await Config.load()
        await new Nuke.default(['-e'], config).run()
      } catch (e) {
        exceptionThrown = true
        exceptionMessage = e.message
      }
      expect(exceptionThrown).to.be.equal(true)
      expect(exceptionMessage).to.to.contain('--environment expects a value')
      expect(configServiceInstance.compileProjectAndLoadConfig).to.have.not.been.called
      expect(providerServiceInstance.nukeCloudProviderResources).to.have.not.been.called
    })

    it('with --environment flag incomplete', async () => {
      let exceptionThrown = false
      let exceptionMessage = ''
      try {
        const config = await Config.load()
        await new Nuke.default(['--environment'], config).run()
      } catch (e) {
        exceptionThrown = true
        exceptionMessage = e.message
      }
      expect(exceptionThrown).to.be.equal(true)
      expect(exceptionMessage).to.to.contain('--environment expects a value')
      expect(configServiceInstance.compileProjectAndLoadConfig).to.have.not.been.called
      expect(providerServiceInstance.nukeCloudProviderResources).to.have.not.been.called
    })

    describe('inside a Magek project', () => {
      it('entering correct environment and application name', async () => {
        replace(Prompter.prototype, 'defaultOrPrompt', fake.resolves('new-magek-app'))
        const config = await Config.load()
        await new Nuke.default(['-e', 'fake_environment'], config).run()

        expect(configServiceInstance.compileProjectAndLoadConfig).to.have.been.called
        expect(providerServiceInstance.nukeCloudProviderResources).to.have.been.called
        expect(oraLogger.info).to.have.been.calledWithMatch('Removal complete!')
      })

      it('entering correct environment and --force flag', async () => {
        const config = await Config.load()
        await new Nuke.default(['-e', 'fake_environment', '--force'], config).run()

        expect(configServiceInstance.compileProjectAndLoadConfig).to.have.been.called
        expect(providerServiceInstance.nukeCloudProviderResources).to.have.been.called
        expect(oraLogger.info).to.have.been.calledWithMatch('Removal complete!')
      })

      it('entering correct environment and -f flag', async () => {
        const config = await Config.load()
        await new Nuke.default(['-e', 'fake_environment', '-f'], config).run()

        expect(configServiceInstance.compileProjectAndLoadConfig).to.have.been.called
        expect(providerServiceInstance.nukeCloudProviderResources).to.have.been.called
        expect(oraLogger.info).to.have.been.calledWithMatch('Removal complete!')
      })

      it('entering correct environment but a wrong application name', async () => {
        replace(Prompter.prototype, 'defaultOrPrompt', fake.resolves('fake app 2'))
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Nuke.default(['-e', 'fake_environment'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Wrong app name, stopping nuke!')
        expect(configServiceInstance.compileProjectAndLoadConfig).to.have.been.called
        expect(providerServiceInstance.nukeCloudProviderResources).to.have.not.been.called
        expect(oraLogger.info).to.have.not.been.calledWithMatch('Removal complete!')
      })

      it('entering correct environment and nonexisting flag', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Nuke.default(['-e', 'fake_environment', '--nonexistingoption'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Nonexistent flag: --nonexistingoption')
        expect(providerServiceInstance.nukeCloudProviderResources).to.have.not.been.called
        expect(oraLogger.info).to.have.not.been.calledWithMatch('Removal complete!')
      })

      it('without defining environment and --force', async () => {
        const config = await Config.load()
        await new Nuke.default(['--force'], config).run()

        expect(providerServiceInstance.nukeCloudProviderResources).to.have.not.been.called
        expect(oraLogger.fail).to.have.been.calledWithMatch(/No environment set/)
      })
    })
  })
})
