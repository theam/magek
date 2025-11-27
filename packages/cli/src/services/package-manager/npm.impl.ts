import { PackageManagerService } from './index.ts'
import { Effect, Layer } from 'effect'
import { makePackageManager } from './common.ts'

export const makeNpmPackageManager = makePackageManager('npm')

export const NpmPackageManager = Layer.effect(PackageManagerService, Effect.orDie(makeNpmPackageManager))
