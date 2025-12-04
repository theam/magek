import { Effect, Context } from 'effect'

export type PackageManagerError = InstallDependenciesError | RunScriptError

export class InstallDependenciesError {
  readonly _tag = 'InstallDependenciesError'
  public readonly error: Error

  constructor(error: Error) {
    this.error = error
  }
}

export class RunScriptError {
  readonly _tag = 'RunScriptError'
  public readonly error: Error

  constructor(error: Error) {
    this.error = error
  }
}

export interface PackageManagerService {
  readonly setProjectRoot: (projectRoot: string) => Effect.Effect<void>
  readonly installProductionDependencies: () => Effect.Effect<void, InstallDependenciesError>
  readonly installAllDependencies: () => Effect.Effect<void, InstallDependenciesError>
  readonly runScript: (scriptName: string, args: ReadonlyArray<string>) => Effect.Effect<string, RunScriptError>
  readonly build: (args: ReadonlyArray<string>) => Effect.Effect<string, RunScriptError>
}

export const PackageManagerService = Context.GenericTag<PackageManagerService>('PackageManagerService')
