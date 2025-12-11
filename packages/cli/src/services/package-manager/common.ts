import { Effect, Ref, pipe } from 'effect'
import { InstallDependenciesError, PackageManagerService, RunScriptError } from './index.js'
import { ProcessError, ProcessService } from '../process/index.js'
import { FileSystemError, FileSystemService } from '../file-system/index.js'

/**
 * Gets the project root directory from the reference.
 * If the reference is an empty string, it will set it
 * to the current working directory and return it.
 */
const ensureProjectDir = (processService: ProcessService, projectDirRef: Ref.Ref<string>) =>
  Effect.gen(function* () {
    const { cwd } = processService
    // ProcessService.cwd() throws ProcessError on failure
    const pwd = yield* Effect.tryPromise({
      try: () => cwd(),
      catch: (error): ProcessError => error as ProcessError,
    })
    const projectDir = yield* Ref.updateAndGet(projectDirRef, (dir) => dir || pwd)
    return projectDir
  })

/**
 * Checks if a script exists in the package.json file
 */
const checkScriptExists = (processService: ProcessService, fileSystemService: FileSystemService, scriptName: string) =>
  Effect.gen(function* () {
    const { cwd } = processService
    const { readFileContents } = fileSystemService
    // ProcessService.cwd() throws ProcessError on failure
    const pwd = yield* Effect.tryPromise({
      try: () => cwd(),
      catch: (error): ProcessError => error as ProcessError,
    })
    const packageJson = yield* Effect.tryPromise({
      try: () => readFileContents(`${pwd}/package.json`),
      catch: (error): FileSystemError => error as FileSystemError,
    })
    const packageJsonContents = JSON.parse(packageJson)
    return packageJsonContents.scripts && packageJsonContents.scripts[scriptName]
  })

/**
 * Function that returns a function to run the build script in the project directory.
 */
const makeRunBuildScript = (command: string, projectDirRef: Ref.Ref<string>) =>
  Effect.gen(function* () {
    const run = yield* makeScopedRun(command, projectDirRef)
    const processService = yield* ProcessService
    const fileSystemService = yield* FileSystemService
    return (args: ReadonlyArray<string>) =>
      Effect.gen(function* () {
        const scriptExists = yield* checkScriptExists(processService, fileSystemService, 'compile')
        const scriptName = scriptExists ? 'compile' : 'build'
        return yield* run('run', scriptName, args)
      })
  })

/**
 * Returns a function that executes a package manager command in the project directory.
 */
export const makeScopedRun = (packageManagerCommand: string, projectDirRef: Ref.Ref<string>) =>
  Effect.gen(function* () {
    const processService = yield* ProcessService
    return (scriptName: string, subscriptName: string | null, args: ReadonlyArray<string>) =>
      Effect.gen(function* () {
        const projectDir = yield* ensureProjectDir(processService, projectDirRef)
        // ProcessService.exec() throws ProcessError on failure
        return yield* Effect.tryPromise({
          try: () =>
            processService.exec(
              `${packageManagerCommand} ${scriptName} ${subscriptName ? subscriptName + ' ' : ''}${args.join(
                ' '
              )}`.trim(),
              projectDir
            ),
          catch: (error): ProcessError => error as ProcessError,
        })
      })
  })

export const makePackageManager = (packageManagerCommand: string) =>
  Effect.gen(function* () {
    // Create a reference to store the current project directory
    const projectDirRef = yield* Ref.make('')

    // Create a function to run a script in the project directory
    const run = yield* makeScopedRun(packageManagerCommand, projectDirRef)

    const runBuild = yield* makeRunBuildScript(packageManagerCommand, projectDirRef)

    const service: PackageManagerService = {
      setProjectRoot: (projectDir: string) => Ref.set(projectDirRef, projectDir),
      runScript: (scriptName: string, args: ReadonlyArray<string>) =>
        pipe(
          run('run', scriptName, args),
          Effect.mapError((error) => new RunScriptError(error.error))
        ),
      build: (args: ReadonlyArray<string>) =>
        pipe(
          runBuild(args),
          Effect.mapError((error) => new RunScriptError(error.error))
        ),
      installProductionDependencies: () =>
        pipe(
          run('install', null, ['--omit=dev', '--omit=optional', '--no-bin-links']),
          Effect.mapError((error) => new InstallDependenciesError(error.error))
        ),
      installAllDependencies: () =>
        pipe(
          run('install', null, []),
          Effect.mapError((error) => new InstallDependenciesError(error.error))
        ),
    }
    return service
  })
