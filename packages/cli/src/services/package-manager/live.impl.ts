import { FileSystemService } from '../file-system.js'
import { ProcessService } from '../process.js'
import { PackageManagerService } from '.'
import { Effect, Layer } from 'effect'
import { makeRushPackageManager } from './rush.impl'
import { makePnpmPackageManager } from './pnpm.impl'
import { makeYarnPackageManager } from './yarn.impl'
import { makeNpmPackageManager } from './npm.impl'
import { LiveFileSystem } from '../file-system/live.impl'
import { LiveProcess } from '../process/live.impl'

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

export const InferredPackageManager = Layer.effect(PackageManagerService, 
  Effect.orDie(inferPackageManagerNameFromDirectoryContents)
)

export const LivePackageManager = Layer.provide(InferredPackageManager, Layer.merge(LiveFileSystem, LiveProcess))
