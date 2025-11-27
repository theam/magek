import { PackageManagerService } from './index.ts'
import { Effect, Layer } from 'effect'
import { makePackageManager } from './common.ts'

export const makeYarnPackageManager = makePackageManager('yarn')

export const YarnPackageManager = Layer.effect(PackageManagerService, Effect.orDie(makeYarnPackageManager))
