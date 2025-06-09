import { PackageManagerService } from '.'
import { Effect, Layer } from 'effect'
import { makePackageManager } from './common'

export const makeYarnPackageManager = makePackageManager('yarn')

export const YarnPackageManager = Layer.effect(PackageManagerService, Effect.orDie(makeYarnPackageManager))
