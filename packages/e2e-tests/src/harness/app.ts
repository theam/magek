import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import * as path from 'node:path'
import { runCommand } from './exec'

export interface ScaffoldOptions {
  appRoot: string
  appName: string
  templatePath: string
  description: string
  registryUrl: string
  env: NodeJS.ProcessEnv
  logsRoot: string
}

export const ensureCreateMagekAvailable = async (
  registryUrl: string,
  env: NodeJS.ProcessEnv,
  logsRoot: string
): Promise<void> => {
  await runCommand('npm', ['view', 'create-magek', '--registry', registryUrl], {
    env,
    logFile: path.join(logsRoot, 'npm-view-create-magek.log')
  })
}

export const scaffoldApp = async (options: ScaffoldOptions): Promise<string> => {
  await mkdir(options.appRoot, { recursive: true })

  const appDir = path.join(options.appRoot, options.appName)

  await runCommand(
    'npm',
    [
      'create',
      'magek@latest',
      options.appName,
      '--',
      '--template',
      options.templatePath,
      '--description',
      options.description
    ],
    {
      cwd: options.appRoot,
      env: options.env,
      logFile: path.join(options.logsRoot, 'npm-create-magek.log')
    }
  )

  if (!existsSync(appDir)) {
    throw new Error(`App directory not found: ${appDir}`)
  }

  return appDir
}

export interface ScaffoldValidationOptions {
  appDir: string
  env: NodeJS.ProcessEnv
  expectedName: string
  logsRoot: string
}

export const assertGitRepoInitialized = async (appDir: string): Promise<void> => {
  const gitDir = path.join(appDir, '.git')
  if (!existsSync(gitDir)) {
    throw new Error('Git repository not initialized')
  }
}

export const assertNodeModulesInstalled = async (appDir: string): Promise<void> => {
  const nodeModules = path.join(appDir, 'node_modules')
  if (!existsSync(nodeModules)) {
    throw new Error('node_modules not found')
  }

  const nodeModulesEntries = await readdir(nodeModules)
  if (nodeModulesEntries.length === 0) {
    throw new Error('node_modules is empty')
  }
}

export const assertMagekCliDependency = async (
  appDir: string,
  env: NodeJS.ProcessEnv,
  logsRoot: string
): Promise<void> => {
  await runCommand('npm', ['list', '@magek/cli'], {
    cwd: appDir,
    env,
    logFile: path.join(logsRoot, 'npm-list-cli.log')
  })
}

export const assertNpmScriptsWorking = async (
  appDir: string,
  env: NodeJS.ProcessEnv,
  logsRoot: string
): Promise<void> => {
  await runCommand('npm', ['run', '--silent'], {
    cwd: appDir,
    env,
    logFile: path.join(logsRoot, 'npm-run-list.log')
  })
}

export const assertRequiredFiles = async (appDir: string, files: string[]): Promise<void> => {
  for (const file of files) {
    const filePath = path.join(appDir, file)
    if (!existsSync(filePath)) {
      throw new Error(`Missing required file: ${file}`)
    }
  }
}

export const assertPackageName = async (appDir: string, expectedName: string): Promise<void> => {
  const packageJsonPath = path.join(appDir, 'package.json')
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { name?: string }
  if (packageJson.name !== expectedName) {
    throw new Error(`Unexpected package name: ${packageJson.name}`)
  }
}

export const validateScaffold = async (options: ScaffoldValidationOptions): Promise<void> => {
  await assertGitRepoInitialized(options.appDir)
  await assertNodeModulesInstalled(options.appDir)
  await assertMagekCliDependency(options.appDir, options.env, options.logsRoot)
  await assertNpmScriptsWorking(options.appDir, options.env, options.logsRoot)
  await assertRequiredFiles(options.appDir, ['package.json', 'tsconfig.json', 'src/index.ts'])
  await assertPackageName(options.appDir, options.expectedName)
}

export const installAppDependencies = async (
  appDir: string,
  env: NodeJS.ProcessEnv,
  logsRoot: string
): Promise<void> => {
  await runCommand('npm', ['install'], {
    cwd: appDir,
    env,
    logFile: path.join(logsRoot, 'npm-install-app.log')
  })
}

export const buildApp = async (
  appDir: string,
  env: NodeJS.ProcessEnv,
  logsRoot: string
): Promise<void> => {
  await runCommand('npm', ['run', 'build'], {
    cwd: appDir,
    env,
    logFile: path.join(logsRoot, 'npm-build-app.log')
  })
}

export const applyBankDepositFixtures = async (
  appDir: string,
  fixturesRoot: string
): Promise<void> => {
  const fixtureDir = path.join(fixturesRoot, 'bank-deposit')
  const targets = [
    { source: 'commands/deposit-money.ts', dest: 'src/commands/deposit-money.ts' },
    { source: 'events/money-deposited.ts', dest: 'src/events/money-deposited.ts' },
    { source: 'entities/account.ts', dest: 'src/entities/account.ts' },
    {
      source: 'event-handlers/deposit-notification-handler.ts',
      dest: 'src/event-handlers/deposit-notification-handler.ts'
    },
    { source: 'read-models/account-balance.ts', dest: 'src/read-models/account-balance.ts' }
  ]

  await mkdir(path.join(appDir, 'src', 'commands'), { recursive: true })
  await mkdir(path.join(appDir, 'src', 'events'), { recursive: true })
  await mkdir(path.join(appDir, 'src', 'entities'), { recursive: true })
  await mkdir(path.join(appDir, 'src', 'event-handlers'), { recursive: true })
  await mkdir(path.join(appDir, 'src', 'read-models'), { recursive: true })

  for (const target of targets) {
    const sourcePath = path.join(fixtureDir, target.source)
    const destPath = path.join(appDir, target.dest)
    if (!existsSync(sourcePath)) {
      throw new Error(`Missing fixture file: ${sourcePath}`)
    }
    await copyFile(sourcePath, destPath)
  }

  const indexPath = path.join(appDir, 'src', 'index.ts')
  const indexContents = await readFile(indexPath, 'utf8')
  if (!indexContents.includes('DepositMoney')) {
    const exportBlock = [
      '',
      '// Bank deposit domain exports',
      "export { DepositMoney } from './commands/deposit-money'",
      "export { MoneyDeposited } from './events/money-deposited'",
      "export { Account } from './entities/account'",
      "export { DepositNotificationHandler } from './event-handlers/deposit-notification-handler'",
      "export { AccountBalance } from './read-models/account-balance'",
      ''
    ].join('\n')

    await writeFile(indexPath, `${indexContents}${exportBlock}`, 'utf8')
  }
}
