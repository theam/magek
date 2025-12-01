import type { MagekConfig, UserApp } from '@magek/common'
import { Effect, pipe } from 'effect'
import * as path from 'path'
import { guardError } from '../common/errors.js'
import { checkItIsAMagekProject } from './project-checker.js'
import { currentEnvironment } from './environment.js'
import { createSandboxProject, removeSandboxProject } from '../common/sandbox.js'
import { PackageManagerService, type PackageManagerError } from './package-manager/index.js'
import { packageManagerLayers } from './package-manager/live.impl.js'

export const DEPLOYMENT_SANDBOX = path.join(process.cwd(), '.deploy')

const loadUserProject = (userProjectPath: string): UserApp => {
  const projectIndexJSPath = path.resolve(path.join(userProjectPath, 'dist', 'index.js'))
  return require(projectIndexJSPath)
}

type ConfigServiceDependencies = {
  readonly loadUserProject: typeof loadUserProject
  readonly checkItIsAMagekProject: typeof checkItIsAMagekProject
  readonly currentEnvironment: typeof currentEnvironment
}

export const configServiceDependencies: ConfigServiceDependencies = {
  loadUserProject,
  checkItIsAMagekProject,
  currentEnvironment,
}

const createDeploymentSandboxImpl = async (): Promise<string> => {
  const config = await compileProjectAndLoadConfig(process.cwd())
  const sandboxRelativePath = createSandboxProject(DEPLOYMENT_SANDBOX, config.assets)
  const effect = Effect.gen(function* () {
    const { setProjectRoot, installProductionDependencies } = yield* PackageManagerService
    yield* setProjectRoot(sandboxRelativePath)
    yield* installProductionDependencies()
  })
  await Effect.runPromise(
    pipe(
      effect,
      Effect.mapError<PackageManagerError, Error>((e) => e.error),
      Effect.provide(packageManagerLayers.LivePackageManager),
      Effect.orDieWith<Error>(guardError('Could not install production dependencies'))
    )
  )
  return sandboxRelativePath
}

const cleanDeploymentSandboxImpl = async (): Promise<void> => {
  removeSandboxProject(DEPLOYMENT_SANDBOX)
}

const compileProjectAndLoadConfigImpl = async (userProjectPath: string): Promise<MagekConfig> => {
  await configServiceDependencies.checkItIsAMagekProject(userProjectPath)
  await configService.compileProject(userProjectPath)
  return readProjectConfig(userProjectPath)
}

const compileProjectImpl = async (projectPath: string): Promise<void> => {
  const effect = compileProjectEff(projectPath)
  await Effect.runPromise(
    pipe(
      effect,
      Effect.mapError<PackageManagerError, Error>((e) => e.error),
      Effect.provide(packageManagerLayers.LivePackageManager),
      Effect.orDieWith<Error>(guardError('Project contains compilation errors'))
    )
  )
}

const compileProjectEff = (projectPath: string) =>
  Effect.gen(function* () {
    const { setProjectRoot, build } = yield* PackageManagerService
    yield* setProjectRoot(projectPath)
    yield* cleanProjectEff(projectPath)
    return yield* build([])
  })

const cleanProjectImpl = async (projectPath: string): Promise<void> => {
  const effect = cleanProjectEff(projectPath)
  await Effect.runPromise(
    pipe(
      effect,
      Effect.mapError<PackageManagerError, Error>((e) => e.error),
      Effect.provide(packageManagerLayers.LivePackageManager),
      Effect.orDieWith<Error>(guardError('Could not clean project'))
    )
  )
}

const cleanProjectEff = (projectPath: string) =>
  Effect.gen(function* () {
    const { setProjectRoot, runScript } = yield* PackageManagerService
    yield* setProjectRoot(projectPath)
    yield* runScript('clean', [])
  })

function readProjectConfig(userProjectPath: string): Promise<MagekConfig> {
  const userProject = configServiceDependencies.loadUserProject(userProjectPath)
  return new Promise((resolve): void => {
    userProject.Magek.configureCurrentEnv((config: MagekConfig): void => {
      checkEnvironmentWasConfigured(userProject)
      resolve(config)
    })
  })
}

function checkEnvironmentWasConfigured(userProject: UserApp): void {
  if (userProject.Magek.configuredEnvironments.size == 0) {
    throw new Error(
      "You haven't configured any environment. Please make sure you have at least one environment configured by calling 'Magek.configure' method (normally done inside the folder 'src/config')"
    )
  }
  const currentEnv = configServiceDependencies.currentEnvironment()
  if (!currentEnv) {
    throw new Error(
      "You haven't provided any environment. Please make sure you are using option '-e' with a valid environment name"
    )
  }
  if (!userProject.Magek.configuredEnvironments.has(currentEnv)) {
    throw new Error(
      `The environment '${currentEnv}' does not match any of the environments you used to configure your Magek project, which are: '${Array.from(
        userProject.Magek.configuredEnvironments
      ).join(', ')}'`
    )
  }
}

export const configService = {
  createDeploymentSandbox: createDeploymentSandboxImpl,
  cleanDeploymentSandbox: cleanDeploymentSandboxImpl,
  compileProjectAndLoadConfig: compileProjectAndLoadConfigImpl,
  compileProject: compileProjectImpl,
  cleanProject: cleanProjectImpl,
}

export const createDeploymentSandbox = (...args: Parameters<typeof createDeploymentSandboxImpl>) =>
  configService.createDeploymentSandbox(...args)

export const cleanDeploymentSandbox = (...args: Parameters<typeof cleanDeploymentSandboxImpl>) =>
  configService.cleanDeploymentSandbox(...args)

export const compileProjectAndLoadConfig = (...args: Parameters<typeof compileProjectAndLoadConfigImpl>) =>
  configService.compileProjectAndLoadConfig(...args)

export const compileProject = (...args: Parameters<typeof compileProjectImpl>) =>
  configService.compileProject(...args)

export const cleanProject = (...args: Parameters<typeof cleanProjectImpl>) => configService.cleanProject(...args)
