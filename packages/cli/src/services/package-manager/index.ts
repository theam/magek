import { Effect, Context } from 'effect'

export type PackageManagerError = InstallDependenciesError | RunScriptError

export class InstallDependenciesError {
  readonly _tag = 'InstallDependenciesError'
  constructor(readonly error: Error) {}
}

export class RunScriptError {
  readonly _tag = 'RunScriptError'
  constructor(readonly error: Error) {}
}

export interface PackageManagerService {
  readonly setProjectRoot: (projectRoot: string) => Effect.Effect<void>
  readonly installProductionDependencies: () => Effect.Effect<void, InstallDependenciesError>
  readonly installAllDependencies: () => Effect.Effect<void, InstallDependenciesError>
  readonly runScript: (scriptName: string, args: ReadonlyArray<string>) => Effect.Effect<string, RunScriptError>
  readonly build: (args: ReadonlyArray<string>) => Effect.Effect<string, RunScriptError>
}

export const PackageManagerService = Context.GenericTag<PackageManagerService>('PackageManagerService')
