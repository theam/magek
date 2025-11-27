import { PackageManagerService } from './index.ts'
import { Effect, Layer } from 'effect'
import { makePackageManager } from './common.ts'

export const makePnpmPackageManager = makePackageManager('pnpm')

export const PnpmPackageManager = Layer.effect(PackageManagerService, Effect.orDie(makePnpmPackageManager))
