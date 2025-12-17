import { PackageManagerService } from './index.js'
import { createPackageManagerService, PackageManagerDependencies } from './common.js'

export const createPnpmPackageManager = (deps: PackageManagerDependencies): PackageManagerService => {
  return createPackageManagerService('pnpm', deps)
}
