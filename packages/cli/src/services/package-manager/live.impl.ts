import { PackageManagerService } from '.'
import { Effect, Layer } from 'effect'
import { makeRushPackageManager } from './rush.impl'
import { makePnpmPackageManager } from './pnpm.impl'
import { makeYarnPackageManager } from './yarn.impl'
import { makeNpmPackageManager } from './npm.impl'
import { LiveFileSystem } from '../file-system/live.impl'
import { LiveProcess } from '../process/live.impl'
import * as fs from 'fs'

const inferPackageManagerNameFromDirectoryContents = async () => {
  const workingDir = process.cwd()
  const contents = await fs.promises.readdir(workingDir)
  if (contents.includes('.rush')) {
    return makeRushPackageManager
  } else if (contents.includes('pnpm-lock.yaml')) {
    return makePnpmPackageManager
  } else if (contents.includes('yarn.lock')) {
    return makeYarnPackageManager
  } else if (contents.includes('package-lock.json')) {
    return makeNpmPackageManager
  } else {
    // Infer npm by default
    return makeNpmPackageManager
  }
}

export const InferredPackageManager = Layer.effect(
  PackageManagerService,
  Effect.orDie(
    Effect.flatten(
      Effect.tryPromise({
        try: inferPackageManagerNameFromDirectoryContents,
        catch: (reason) => reason as Error,
      })
    )
  )
)

export const LivePackageManager = Layer.provide(InferredPackageManager, Layer.merge(LiveFileSystem, LiveProcess))
