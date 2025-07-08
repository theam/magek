import { InstallDependenciesError, PackageManagerService, RunScriptError } from './index.js'
import { Effect, Layer, pipe, Ref } from 'effect'
import { makePackageManager, makeScopedRun } from './common.js'

// TODO: Look recursively up for a rush.json file and run ./common/scripts/install-run-rushx.js
export const makeRushPackageManager = Effect.gen(function* () {
  // Create a reference to store the current project directory
  const projectDirRef = yield* Ref.make('')

  // Create a function to run a script in the project directory
  const runRush = yield* makeScopedRun('rush', projectDirRef)
  const runRushX = yield* makeScopedRun('rushx', projectDirRef)

  const commonService = yield* makePackageManager('rush')

  const service: PackageManagerService = {
    ...commonService,
    runScript: (scriptName: string, args: ReadonlyArray<string>) =>
      pipe(
        runRushX(scriptName, null, args),
        Effect.mapError((error: any) => new RunScriptError(error.error))
      ),
    build: (args: ReadonlyArray<string>) =>
      pipe(
        runRush('build', null, args),
        Effect.mapError((error: any) => new RunScriptError(error.error))
      ),
    installProductionDependencies: () =>
      Effect.fail(
        new InstallDependenciesError(
          new Error('Rush is a monorepo manager, so it does not support installing production dependencies')
        )
      ),
    installAllDependencies: () =>
      pipe(
        runRush('update', null, []),
        Effect.mapError((error: any) => new InstallDependenciesError(error.error)),
        Effect.map(() => undefined as void)
      ),
  }
  return service
})

export const RushPackageManager = Layer.effect(PackageManagerService, Effect.orDie(makeRushPackageManager))
