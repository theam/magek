import { InstallDependenciesError, PackageManagerService, RunScriptError } from './index.js'
import { ProcessService } from '../process/index.js'
import { FileSystemService } from '../file-system/index.js'

export type PackageManagerDependencies = {
  processService: ProcessService
  fileSystemService: FileSystemService
}

/**
 * Returns a function that executes a package manager command in the project directory.
 */
export const makeScopedRun = (
  packageManagerCommand: string,
  processService: ProcessService,
  projectDirRef: { value: string }
) => {
  return async (scriptName: string, subscriptName: string | null, args: ReadonlyArray<string>): Promise<string> => {
    const projectDir = projectDirRef.value || processService.cwd()
    if (!projectDirRef.value) {
      projectDirRef.value = projectDir
    }
    return processService.exec(
      `${packageManagerCommand} ${scriptName} ${subscriptName ? subscriptName + ' ' : ''}${args.join(' ')}`.trim(),
      projectDir
    )
  }
}

/**
 * Checks if a script exists in the package.json file
 */
const checkScriptExists = async (
  processService: ProcessService,
  fileSystemService: FileSystemService,
  scriptName: string
): Promise<boolean> => {
  const pwd = processService.cwd()
  const packageJson = await fileSystemService.readFileContents(`${pwd}/package.json`)
  const packageJsonContents = JSON.parse(packageJson)
  return !!(packageJsonContents.scripts && packageJsonContents.scripts[scriptName])
}

export const createPackageManagerService = (
  packageManagerCommand: string,
  deps: PackageManagerDependencies
): PackageManagerService => {
  const { processService, fileSystemService } = deps
  // Create a reference to store the current project directory
  const projectDirRef = { value: '' }

  // Create a function to run a script in the project directory
  const run = makeScopedRun(packageManagerCommand, processService, projectDirRef)

  const service: PackageManagerService = {
    setProjectRoot: (projectDir: string): void => {
      projectDirRef.value = projectDir
    },
    runScript: async (scriptName: string, args: ReadonlyArray<string>): Promise<string> => {
      try {
        return await run('run', scriptName, args)
      } catch (error) {
        throw new RunScriptError(`Failed to run script ${scriptName}`, error instanceof Error ? error : undefined)
      }
    },
    build: async (args: ReadonlyArray<string>): Promise<string> => {
      try {
        const scriptExists = await checkScriptExists(processService, fileSystemService, 'compile')
        const scriptName = scriptExists ? 'compile' : 'build'
        return await run('run', scriptName, args)
      } catch (error) {
        throw new RunScriptError('Failed to build', error instanceof Error ? error : undefined)
      }
    },
    installProductionDependencies: async (): Promise<void> => {
      try {
        await run('install', null, ['--omit=dev', '--omit=optional', '--no-bin-links'])
      } catch (error) {
        throw new InstallDependenciesError(
          'Failed to install production dependencies',
          error instanceof Error ? error : undefined
        )
      }
    },
    installAllDependencies: async (): Promise<void> => {
      try {
        await run('install', null, [])
      } catch (error) {
        throw new InstallDependenciesError(
          'Failed to install dependencies',
          error instanceof Error ? error : undefined
        )
      }
    },
  }
  return service
}
