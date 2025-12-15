import { InstallDependenciesError, PackageManagerService, RunScriptError } from './index.js'
import { makeScopedRun, createPackageManagerService, PackageManagerDependencies } from './common.js'

// TODO: Look recursively up for a rush.json file and run ./common/scripts/install-run-rushx.js
export const createRushPackageManager = (deps: PackageManagerDependencies): PackageManagerService => {
  const { processService } = deps
  // Create a reference to store the current project directory
  const projectDirRef = { value: '' }

  // Create a function to run a script in the project directory
  const runRush = makeScopedRun('rush', processService, projectDirRef)
  const runRushX = makeScopedRun('rushx', processService, projectDirRef)

  const commonService = createPackageManagerService('rush', deps)

  const service: PackageManagerService = {
    ...commonService,
    setProjectRoot: (projectDir: string): void => {
      projectDirRef.value = projectDir
    },
    runScript: async (scriptName: string, args: ReadonlyArray<string>): Promise<string> => {
      try {
        return await runRushX(scriptName, null, args)
      } catch (error) {
        throw new RunScriptError(`Failed to run script ${scriptName}`, error instanceof Error ? error : undefined)
      }
    },
    build: async (args: ReadonlyArray<string>): Promise<string> => {
      try {
        return await runRush('build', null, args)
      } catch (error) {
        throw new RunScriptError('Failed to build', error instanceof Error ? error : undefined)
      }
    },
    installProductionDependencies: async (): Promise<void> => {
      throw new InstallDependenciesError(
        'Rush is a monorepo manager, so it does not support installing production dependencies'
      )
    },
    installAllDependencies: async (): Promise<void> => {
      try {
        await runRush('update', null, [])
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
