import { PackageManagerService } from '.'
import { Layer, orDie } from '@booster-ai/common'
import { makePackageManager } from './common'

export const makeYarnPackageManager = makePackageManager('yarn')

export const YarnPackageManager = Layer.fromEffect(PackageManagerService)(orDie(makeYarnPackageManager))
