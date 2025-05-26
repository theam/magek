import { PackageManagerService } from '.'
import { Layer, orDie } from '@booster-ai/common'
import { makePackageManager } from './common'

export const makePnpmPackageManager = makePackageManager('pnpm')

export const PnpmPackageManager = Layer.fromEffect(PackageManagerService)(orDie(makePnpmPackageManager))
