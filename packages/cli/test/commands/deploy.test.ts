import { expect } from '../expect.ts'
import { fancy } from 'fancy-test'
import { restore, fake, replace } from 'sinon'
import { MagekConfig, type ProviderLibrary } from '@magek/common'
import { runCommand } from '@oclif/test'
import * as Deploy from '../../src/commands/deploy.ts'
import * as providerService from '../../src/services/provider-service.ts'
import { oraLogger } from '../../src/services/logger.ts'
import { Config } from '@oclif/core'
import * as environment from '../../src/services/environment.ts'
import * as packageManagerImpl from '../../src/services/package-manager/live.impl.ts'
import * as configService from '../../src/services/config-service.ts'
import * as projectChecker from '../../src/services/project-checker.ts'
import { makeTestPackageManager } from '../services/package-manager/test.impl.ts'

const projectCheckerInstance = projectChecker.projectChecker
const configServiceInstance = configService.configService
const environmentInstance = environment.environmentService
const providerServiceInstance = providerService.providerService

type DeployRunTasks = (
  compileAndLoad: Promise<MagekConfig>,
  deployer: (config: MagekConfig) => Promise<void>
) => Promise<void>

const runTasks: DeployRunTasks = Deploy.runTasks

const TestPackageManager = makeTestPackageManager()

describe('deploy', () => {
  beforeEach(() => {
    delete process.env.MAGEK_ENV
  })

  afterEach(() => {
    TestPackageManager.reset()
    // Restore the default sinon sandbox here
    restore()
  })

  // TODO: Check if I can test that `runTasks` is called from the Command `run` method using `sinon.replace(...)`

  describe('runTasks function', () => {
    context('when an unexpected problem happens', () => {
      fancy.stdout().it('fails gracefully showing the error message', async () => {
        const msg = 'weird exception'
        const fakeLoader = Promise.reject(new Error(msg))
        const fakeDeployer = fake.resolves(undefined)
        replace(environmentInstance, 'currentEnvironment', fake.returns('test-env'))

        await expect(runTasks(fakeLoader as Promise<MagekConfig>, fakeDeployer)).to.eventually.be.rejectedWith(msg)
        expect(fakeDeployer).not.to.have.been.called
      })
    })

    context('when index.ts structure is not correct', () => {
      fancy.stdout().it('fails gracefully', async () => {
        const msg = 'An error when loading project'
        const fakeLoader = Promise.reject(new Error(msg))
        const fakeDeployer = fake.resolves(undefined)
        replace(environmentInstance, 'currentEnvironment', fake.returns('test-env'))

        await expect(runTasks(fakeLoader as Promise<MagekConfig>, fakeDeployer)).to.eventually.be.rejectedWith(msg)
        expect(fakeDeployer).not.to.have.been.called
      })
    })

    context('when there is a valid index.ts', () => {
      fancy.stdout().it('Starts deployment', async (ctx) => {
        // TODO: Once we migrate all services to the new way, we can remove this and just use the Test Layer for each of them
        replace(packageManagerImpl.packageManagerLayers, 'LivePackageManager', TestPackageManager.layer)

        const fakeProvider = {} as ProviderLibrary

        const fakeLoader = fake.resolves({
          provider: fakeProvider,
          appName: 'fake app',
          region: 'tunte',
          entities: {},
        })

        const fakeDeployer = fake(async (config: MagekConfig) => {
          config.logger?.info('this is a progress update')
        })

        replace(environmentInstance, 'currentEnvironment', fake.returns('test-env'))

        await runTasks(fakeLoader() as Promise<MagekConfig>, fakeDeployer)

        expect(ctx.stdout).to.include('Deployment complete')

        expect(fakeDeployer).to.have.been.calledOnce
      })
    })
  })

  describe('run', () => {
    context('when no environment provided', async () => {
      it('shows no environment provided error', async () => {
        const {stdout} = await runCommand<{name: string}>(['deploy'], { root: __dirname })
        expect(stdout).to.match(/No environment set/)
      })
    })
  })

  describe('deploy class', () => {
    beforeEach(() => {
      const config = new MagekConfig('fake_environment')
      replace(configServiceInstance, 'compileProjectAndLoadConfig', fake.resolves(config))
      replace(providerServiceInstance, 'deployToCloudProvider', fake.resolves({}))
      replace(configServiceInstance, 'createDeploymentSandbox', fake.resolves('fake/path'))
      replace(configServiceInstance, 'cleanDeploymentSandbox', fake.resolves({}))
      replace(projectCheckerInstance, 'checkCurrentDirMagekVersion', fake.resolves({}))
      replace(oraLogger, 'fail', fake.resolves({}))
      replace(oraLogger, 'info', fake.resolves({}))
      replace(oraLogger, 'start', fake.resolves({}))
      replace(oraLogger, 'succeed', fake.resolves({}))
    })

    it('init calls checkCurrentDirMagekVersion', async () => {
      const config = await Config.load()
      await new Deploy.default([], config).init()
      expect(projectCheckerInstance.checkCurrentDirMagekVersion).to.have.been.called
    })

    it('without flags', async () => {
      const config = await Config.load()
      await new Deploy.default([], config).run()

      expect(configServiceInstance.compileProjectAndLoadConfig).to.have.not.been.called
      expect(providerServiceInstance.deployToCloudProvider).to.have.not.been.called
      expect(oraLogger.fail).to.have.been.calledWithMatch(/No environment set/)
    })

    it('with -e flag incomplete', async () => {
      let exceptionThrown = false
      let exceptionMessage = ''
      try {
        const config = await Config.load()
        await new Deploy.default(['-e'], config).run()
      } catch (e) {
        exceptionThrown = true
        exceptionMessage = e.message
      }
      expect(exceptionThrown).to.be.equal(true)
      expect(exceptionMessage).to.contain('--environment expects a value')
      expect(configServiceInstance.compileProjectAndLoadConfig).to.have.not.been.called
      expect(providerServiceInstance.deployToCloudProvider).to.have.not.been.called
    })

    it('with --environment flag incomplete', async () => {
      let exceptionThrown = false
      let exceptionMessage = ''
      try {
        const config = await Config.load()
        await new Deploy.default(['--environment'], config).run()
      } catch (e) {
        exceptionThrown = true
        exceptionMessage = e.message
      }
      expect(exceptionThrown).to.be.equal(true)
      expect(exceptionMessage).to.to.contain('--environment expects a value')
      expect(configServiceInstance.compileProjectAndLoadConfig).to.have.not.been.called
      expect(providerServiceInstance.deployToCloudProvider).to.have.not.been.called
    })

    describe('inside a Magek project', () => {
      it('entering correct environment', async () => {
        const config = await Config.load()
        await new Deploy.default(['-e', 'fake_environment'], config).run()

        expect(configServiceInstance.compileProjectAndLoadConfig).to.have.been.called
        expect(providerServiceInstance.deployToCloudProvider).to.have.been.called
        expect(oraLogger.info).to.have.been.calledWithMatch('Deployment complete!')
      })

      it('entering correct environment and nonexisting flag', async () => {
        let exceptionThrown = false
        let exceptionMessage = ''
        try {
          const config = await Config.load()
          await new Deploy.default(['-e', 'fake_environment', '--nonexistingoption'], config).run()
        } catch (e) {
          exceptionThrown = true
          exceptionMessage = e.message
        }
        expect(exceptionThrown).to.be.equal(true)
        expect(exceptionMessage).to.contain('Nonexistent flag: --nonexistingoption')
        expect(configServiceInstance.compileProjectAndLoadConfig).to.have.not.been.called
        expect(providerServiceInstance.deployToCloudProvider).to.have.not.been.called
        expect(oraLogger.info).to.have.not.been.calledWithMatch('Deployment complete!')
      })
    })
  })
})
