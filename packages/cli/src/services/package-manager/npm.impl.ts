import { PackageManagerService } from '.'
import { Layer, orDie } from '@booster-ai/common'
import { makePackageManager } from './common'

export const makeNpmPackageManager = makePackageManager('npm')

export const NpmPackageManager = Layer.fromEffect(PackageManagerService)(orDie(makeNpmPackageManager))
