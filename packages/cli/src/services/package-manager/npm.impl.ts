import { PackageManagerService } from './index.js'
import { createPackageManagerService, PackageManagerDependencies } from './common.js'

export const createNpmPackageManager = (deps: PackageManagerDependencies): PackageManagerService => {
  return createPackageManagerService('npm', deps)
}
