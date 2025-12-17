import { FileSystemService } from '../file-system/index.js'
import { ProcessService } from '../process/index.js'
import { PackageManagerService } from './index.js'
import { createRushPackageManager } from './rush.impl.js'
import { createPnpmPackageManager } from './pnpm.impl.js'
import { createYarnPackageManager } from './yarn.impl.js'
import { createNpmPackageManager } from './npm.impl.js'
import { liveFileSystemService } from '../file-system/live.impl.js'
import { liveProcessService } from '../process/live.impl.js'
import { PackageManagerDependencies } from './common.js'

type PackageManagerFactory = (deps: PackageManagerDependencies) => PackageManagerService

export const inferPackageManagerFromDirectoryContents = async (
  processService: ProcessService,
  fileSystemService: FileSystemService
): Promise<PackageManagerFactory> => {
  const workingDir = processService.cwd()
  const contents = await fileSystemService.readDirectoryContents(workingDir)

  if (contents.includes('.rush')) {
    return createRushPackageManager
  }
  if (contents.includes('pnpm-lock.yaml')) {
    return createPnpmPackageManager
  }
  if (contents.includes('yarn.lock')) {
    return createYarnPackageManager
  }
  if (contents.includes('package-lock.json')) {
    return createNpmPackageManager
  }
  // Infer npm by default
  return createNpmPackageManager
}

export const createLivePackageManager = async (): Promise<PackageManagerService> => {
  const processService = liveProcessService
  const fileSystemService = liveFileSystemService
  const factory = await inferPackageManagerFromDirectoryContents(processService, fileSystemService)
  return factory({ processService, fileSystemService })
}
