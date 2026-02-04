import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import * as path from 'node:path'

export interface RushNpmrcBackup {
  npmrcPath: string
  npmrcPublishPath: string
  npmrcBackupPath?: string
  npmrcPublishBackupPath?: string
}

const buildAuthLine = (registryUrl: string): string => {
  const url = new URL(registryUrl)
  return `//${url.host}/:_authToken=ci`
}

export const configureRushRegistry = async (
  repoRoot: string,
  registryUrl: string,
  logsRoot: string
): Promise<RushNpmrcBackup> => {
  const npmrcPath = path.join(repoRoot, 'common', 'config', 'rush', '.npmrc')
  const npmrcPublishPath = path.join(repoRoot, 'common', 'config', 'rush', '.npmrc-publish')
  const backupRoot = path.join(logsRoot, 'rush-npmrc-backups')
  await mkdir(backupRoot, { recursive: true })

  const backup: RushNpmrcBackup = { npmrcPath, npmrcPublishPath }

  if (existsSync(npmrcPath)) {
    const npmrcBackupPath = path.join(backupRoot, '.npmrc')
    const contents = await readFile(npmrcPath, 'utf8')
    await writeFile(npmrcBackupPath, contents, 'utf8')
    backup.npmrcBackupPath = npmrcBackupPath
  }

  if (existsSync(npmrcPublishPath)) {
    const npmrcPublishBackupPath = path.join(backupRoot, '.npmrc-publish')
    const contents = await readFile(npmrcPublishPath, 'utf8')
    await writeFile(npmrcPublishBackupPath, contents, 'utf8')
    backup.npmrcPublishBackupPath = npmrcPublishBackupPath
  }

  const authLine = buildAuthLine(registryUrl)

  await writeFile(
    npmrcPath,
    `# Temporary configuration for E2E testing with local Verdaccio\nregistry=${registryUrl}\n${authLine}\nalways-auth=false\n`,
    'utf8'
  )

  await writeFile(
    npmrcPublishPath,
    `# Temporary configuration for E2E testing with local Verdaccio\nregistry=${registryUrl}\n${authLine}\n`,
    'utf8'
  )

  return backup
}

export const restoreRushRegistry = async (backup: RushNpmrcBackup): Promise<void> => {
  if (backup.npmrcBackupPath && existsSync(backup.npmrcBackupPath)) {
    const contents = await readFile(backup.npmrcBackupPath, 'utf8')
    await writeFile(backup.npmrcPath, contents, 'utf8')
  } else if (existsSync(backup.npmrcPath)) {
    await rm(backup.npmrcPath)
  }

  if (backup.npmrcPublishBackupPath && existsSync(backup.npmrcPublishBackupPath)) {
    const contents = await readFile(backup.npmrcPublishBackupPath, 'utf8')
    await writeFile(backup.npmrcPublishPath, contents, 'utf8')
  } else if (existsSync(backup.npmrcPublishPath)) {
    await rm(backup.npmrcPublishPath)
  }
}
