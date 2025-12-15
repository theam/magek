import { PackageManagerService } from './index.js'
import { createPackageManagerService, PackageManagerDependencies } from './common.js'

export const createYarnPackageManager = (deps: PackageManagerDependencies): PackageManagerService => {
  return createPackageManagerService('yarn', deps)
}
