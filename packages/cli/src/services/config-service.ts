import type { MagekConfig, UserApp } from '@magek/common'
import * as path from 'path'
import { guardError } from '../common/errors.js'
import { checkItIsAMagekProject } from './project-checker.js'
import { currentEnvironment } from './environment.js'
import { createLivePackageManager } from './package-manager/live.impl.js'

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

const compileProjectAndLoadConfigImpl = async (userProjectPath: string): Promise<MagekConfig> => {
  await configServiceDependencies.checkItIsAMagekProject(userProjectPath)
  await configService.compileProject(userProjectPath)
  return readProjectConfig(userProjectPath)
}

const compileProjectImpl = async (projectPath: string): Promise<void> => {
  try {
    const packageManager = await createLivePackageManager()
    packageManager.setProjectRoot(projectPath)
    await cleanProjectImpl(projectPath)
    await packageManager.build([])
  } catch (error) {
    throw guardError('Project contains compilation errors')(error)
  }
}

const cleanProjectImpl = async (projectPath: string): Promise<void> => {
  try {
    const packageManager = await createLivePackageManager()
    packageManager.setProjectRoot(projectPath)
    await packageManager.runScript('clean', [])
  } catch (error) {
    throw guardError('Could not clean project')(error)
  }
}

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
  compileProjectAndLoadConfig: compileProjectAndLoadConfigImpl,
  compileProject: compileProjectImpl,
  cleanProject: cleanProjectImpl,
}

export const compileProjectAndLoadConfig = (...args: Parameters<typeof compileProjectAndLoadConfigImpl>) =>
  configService.compileProjectAndLoadConfig(...args)

export const compileProject = (...args: Parameters<typeof compileProjectImpl>) =>
  configService.compileProject(...args)

export const cleanProject = (...args: Parameters<typeof cleanProjectImpl>) => configService.cleanProject(...args)
