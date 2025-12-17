export type PackageManagerError = InstallDependenciesError | RunScriptError

export class InstallDependenciesError extends Error {
  readonly _tag = 'InstallDependenciesError'

  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'InstallDependenciesError'
  }
}

export class RunScriptError extends Error {
  readonly _tag = 'RunScriptError'

  constructor(message: string, public readonly cause?: Error) {
    super(message)
    this.name = 'RunScriptError'
  }
}

export interface PackageManagerService {
  setProjectRoot(projectRoot: string): void
  installProductionDependencies(): Promise<void>
  installAllDependencies(): Promise<void>
  runScript(scriptName: string, args: ReadonlyArray<string>): Promise<string>
  build(args: ReadonlyArray<string>): Promise<string>
}
