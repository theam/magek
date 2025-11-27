import { FileSystemService } from '../file-system/index.ts'
import { ProcessService } from '../process/index.ts'
import { PackageManagerService } from './index.ts'
import { Effect, Layer } from 'effect'
import { makeRushPackageManager } from './rush.impl.ts'
import { makePnpmPackageManager } from './pnpm.impl.ts'
import { makeYarnPackageManager } from './yarn.impl.ts'
import { makeNpmPackageManager } from './npm.impl.ts'
import { LiveFileSystem } from '../file-system/live.impl.ts'
import { LiveProcess } from '../process/live.impl.ts'

const inferPackageManagerNameFromDirectoryContents = Effect.gen(function* () {
  const { cwd } = yield* ProcessService
  const { readDirectoryContents } = yield* FileSystemService
  const workingDir = yield* cwd()
  const contents = yield* readDirectoryContents(workingDir)
  if (contents.includes('.rush')) {
    return yield* makeRushPackageManager
  } else if (contents.includes('pnpm-lock.yaml')) {
    return yield* makePnpmPackageManager
  } else if (contents.includes('yarn.lock')) {
    return yield* makeYarnPackageManager
  } else if (contents.includes('package-lock.json')) {
    return yield* makeNpmPackageManager
  } else {
    // Infer npm by default
    return yield* makeNpmPackageManager
  }
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
