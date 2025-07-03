import { PackageManagerService } from '.'
import { Effect, Layer } from 'effect'
import { makePackageManager } from './common.js'

export const makeNpmPackageManager = makePackageManager('npm')

export const NpmPackageManager = Layer.effect(PackageManagerService, Effect.orDie(makeNpmPackageManager))
