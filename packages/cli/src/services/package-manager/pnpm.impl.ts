import { PackageManagerService } from './index.js'
import { Effect, Layer } from 'effect'
import { makePackageManager } from './common.js'

export const makePnpmPackageManager = makePackageManager('pnpm')

export const PnpmPackageManager = Layer.effect(PackageManagerService, Effect.orDie(makePnpmPackageManager))
