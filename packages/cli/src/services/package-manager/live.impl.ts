import { FileSystemError, FileSystemService } from '../file-system/index.js'
import { ProcessError, ProcessService } from '../process/index.js'
import { PackageManagerService } from './index.js'
import { Effect, Layer } from 'effect'
import { makeRushPackageManager } from './rush.impl.js'
import { makePnpmPackageManager } from './pnpm.impl.js'
import { makeYarnPackageManager } from './yarn.impl.js'
import { makeNpmPackageManager } from './npm.impl.js'
import { LiveFileSystem } from '../file-system/live.impl.js'
import { LiveProcess } from '../process/live.impl.js'

const inferPackageManagerFromContents = async (
  processService: ProcessService,
  fileSystemService: FileSystemService
) => {
  let workingDir: string
  try {
    workingDir = await processService.cwd()
  } catch (error) {
    throw error as ProcessError
  }

  let contents: ReadonlyArray<string>
  try {
    contents = await fileSystemService.readDirectoryContents(workingDir)
  } catch (error) {
    throw error as FileSystemError
  }

  if (contents.includes('.rush')) {
    return makeRushPackageManager
  }
  if (contents.includes('pnpm-lock.yaml')) {
    return makePnpmPackageManager
  }
  if (contents.includes('yarn.lock')) {
    return makeYarnPackageManager
  }
  if (contents.includes('package-lock.json')) {
    return makeNpmPackageManager
  }
  // Infer npm by default
  return makeNpmPackageManager
}

const inferPackageManagerNameFromDirectoryContents = Effect.gen(function* () {
  const processService = yield* ProcessService
  const fileSystemService = yield* FileSystemService
  const packageManagerEffect = yield* Effect.tryPromise({
    try: () => inferPackageManagerFromContents(processService, fileSystemService),
    catch: (error) => error as ProcessError | FileSystemError,
  })

  return yield* packageManagerEffect
})

const inferredPackageManagerLayer = Layer.effect(
  PackageManagerService,
  Effect.orDie(inferPackageManagerNameFromDirectoryContents)
)

const livePackageManagerLayer = Layer.provide(inferredPackageManagerLayer, Layer.merge(LiveFileSystem, LiveProcess))

export const packageManagerLayers = {
  InferredPackageManager: inferredPackageManagerLayer,
  LivePackageManager: livePackageManagerLayer,
}

export const InferredPackageManager = packageManagerLayers.InferredPackageManager
export const LivePackageManager = packageManagerLayers.LivePackageManager
