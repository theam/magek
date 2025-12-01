import { replace, restore, stub } from 'sinon'
import type { SinonStub } from 'sinon'
import * as projectChecker from '../../src/services/project-checker.js'
import { MagekConfig, type UserApp } from '@magek/common'
import { expect } from '../expect.js'
import * as environment from '../../src/services/environment.js'
import * as PackageManager from '../../src/services/package-manager/live.impl.js'
import { makeTestPackageManager } from './package-manager/test.impl.js'
import { configService, configServiceDependencies } from '../../src/services/config-service.js'
const TestPackageManager = makeTestPackageManager()
const environmentInstance = environment.environmentService
const projectCheckerInstance = projectChecker.projectChecker

describe('configService', () => {
  const userProjectPath = 'path/to/project'
  afterEach(() => {
    restore()
    TestPackageManager.reset()
  })

  describe('compileProject', () => {
    it('runs the npm command', async () => {
      replace(PackageManager.packageManagerLayers, 'LivePackageManager', TestPackageManager.layer)
      await configService.compileProject(userProjectPath)
      expect(TestPackageManager.fakes.runScript).to.have.calledWith('clean')
      expect(TestPackageManager.fakes.build).to.have.been.called
    })
  })

  describe('cleanProject', () => {
    it('runs the npm command', async () => {
      replace(PackageManager.packageManagerLayers, 'LivePackageManager', TestPackageManager.layer)
      await configService.cleanProject(userProjectPath)
      expect(TestPackageManager.fakes.runScript).to.have.been.calledWith('clean')
    })
  })

  describe('compileProjectAndLoadConfig', () => {
    let checkItIsAMagekProject: SinonStub
    let compileProject: SinonStub
    const makeUserApp = (config: MagekConfig, configuredEnvironments: Set<string>): UserApp => ({
      Magek: {
        config,
        configuredEnvironments,
        configureCurrentEnv: (configurator: (config: MagekConfig) => void): void => configurator(config),
      },
      eventDispatcher: async (): Promise<void> => undefined,
      graphQLDispatcher: async (): Promise<undefined> => undefined,
      triggerScheduledCommands: async (): Promise<void> => undefined,
      notifySubscribers: async (): Promise<void> => undefined,
      rocketDispatcher: async (): Promise<undefined> => undefined,
      consumeEventStream: async (): Promise<undefined> => undefined,
      produceEventStream: async (): Promise<undefined> => undefined,
      health: async (): Promise<undefined> => undefined,
    })

    beforeEach(() => {
      checkItIsAMagekProject = stub(projectCheckerInstance, 'checkItIsAMagekProject').resolves()
      compileProject = stub(configService, 'compileProject').resolves()
    })

    it('loads the config when the selected environment exists', async () => {
      const config = new MagekConfig('test')

      replace(
        configServiceDependencies,
        'loadUserProject',
        () => makeUserApp(config, new Set(['test']))
      )

      replace(environmentInstance, 'currentEnvironment', () => 'test')

      await expect(configService.compileProjectAndLoadConfig(userProjectPath)).to.eventually.become(config)
      expect(checkItIsAMagekProject).to.have.been.calledOnceWithExactly(userProjectPath)
      expect(compileProject).to.have.been.calledOnceWithExactly(userProjectPath)
    })

    it('throws the right error when there are not configured environments', async () => {
      const config = new MagekConfig('test')

      replace(
        configServiceDependencies,
        'loadUserProject',
        () => makeUserApp(config, new Set())
      )

      await expect(configService.compileProjectAndLoadConfig(userProjectPath)).to.eventually.be.rejectedWith(
        /You haven't configured any environment/
      )
      expect(checkItIsAMagekProject).to.have.been.calledOnceWithExactly(userProjectPath)
      expect(compileProject).to.have.been.calledOnceWithExactly(userProjectPath)
    })

    it('throws the right error when the environment does not exist', async () => {
      const config = new MagekConfig('test')

      replace(
        configServiceDependencies,
        'loadUserProject',
        () => makeUserApp(config, new Set(['another']))
      )

      replace(environmentInstance, 'currentEnvironment', () => 'test')

      await expect(configService.compileProjectAndLoadConfig(userProjectPath)).to.eventually.be.rejectedWith(
        /The environment 'test' does not match any of the environments/
      )
      expect(checkItIsAMagekProject).to.have.been.calledOnceWithExactly(userProjectPath)
      expect(compileProject).to.have.been.calledOnceWithExactly(userProjectPath)
    })
  })
})
