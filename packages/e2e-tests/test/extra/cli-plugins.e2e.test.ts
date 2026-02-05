import { expect } from 'chai'
import { after, before, describe, it } from 'mocha'
import { existsSync } from 'node:fs'
import * as path from 'node:path'
import {
  buildApp,
  ensureCreateMagekAvailable,
  installAppDependencies,
  scaffoldApp
} from '../../src/harness/app'
import { runCommand, type RunCommandResult } from '../../src/harness/exec'
import { ensureGitRepo } from '../../src/harness/git'
import { buildNpmEnv, createNpmUserConfig } from '../../src/harness/npm'
import { resolvePaths, type E2EPaths } from '../../src/harness/paths'
import { configureRushRegistry, restoreRushRegistry, type RushNpmrcBackup } from '../../src/harness/rush'
import { startVerdaccio, type VerdaccioInstance } from '../../src/harness/verdaccio'

describe('CLI plugins (extra)', function () {
  this.timeout(20 * 60 * 1000)

  let paths: E2EPaths
  let npmEnv: NodeJS.ProcessEnv
  let verdaccio: VerdaccioInstance | undefined
  let rushBackup: RushNpmrcBackup | undefined
  let appDir: string | undefined

  const steps = {
    verdaccioStarted: false,
    rushConfigured: false,
    rushUpdated: false,
    rushInstalled: false,
    rushRebuilt: false,
    gitReady: false,
    packagesPublished: false,
    createMagekAvailable: false,
    appScaffolded: false,
    appDependenciesInstalled: false,
    appBuilt: false,
    pluginsListed: false,
    pluginInstalled: false,
    pluginVisible: false
  }

  const requireStep = function (context: Mocha.Context, ready: boolean): void {
    if (!ready) {
      context.skip()
    }
  }

  before(async () => {
    paths = await resolvePaths()

    if (!existsSync(paths.fixturesRoot)) {
      throw new Error(`Fixtures directory not found: ${paths.fixturesRoot}`)
    }

    if (!existsSync(paths.verdaccioConfigPath)) {
      throw new Error(`Verdaccio config not found: ${paths.verdaccioConfigPath}`)
    }

    const npmUserConfig = await createNpmUserConfig(paths.logsRoot, paths.registryUrl)
    npmEnv = buildNpmEnv(paths.registryUrl, npmUserConfig)
  })

  after(async () => {
    if (verdaccio) {
      await verdaccio.process.stop()
    }

    if (rushBackup) {
      await restoreRushRegistry(rushBackup)
    }
  })

  // --- Infrastructure setup (same as core e2e) ---

  it('starts the Verdaccio registry', async function () {
    verdaccio = await startVerdaccio({
      configPath: paths.verdaccioConfigPath,
      registryUrl: paths.registryUrl,
      logsRoot: paths.logsRoot,
      env: npmEnv
    })

    steps.verdaccioStarted = true
  })

  it('configures Rush to use the local registry', async function () {
    requireStep(this, steps.verdaccioStarted)

    rushBackup = await configureRushRegistry(paths.repoRoot, paths.registryUrl, paths.logsRoot)
    steps.rushConfigured = true
  })

  it('runs rush update', async function () {
    requireStep(this, steps.rushConfigured)

    await runCommand('rush', ['update'], {
      cwd: paths.repoRoot,
      env: npmEnv,
      logFile: path.join(paths.logsRoot, 'rush-update.log')
    })

    steps.rushUpdated = true
  })

  it('runs rush install', async function () {
    requireStep(this, steps.rushUpdated)

    await runCommand('rush', ['install'], {
      cwd: paths.repoRoot,
      env: npmEnv,
      logFile: path.join(paths.logsRoot, 'rush-install.log')
    })

    steps.rushInstalled = true
  })

  it('runs rush rebuild', async function () {
    requireStep(this, steps.rushInstalled)

    await runCommand('rush', ['rebuild'], {
      cwd: paths.repoRoot,
      env: npmEnv,
      logFile: path.join(paths.logsRoot, 'rush-rebuild.log')
    })

    steps.rushRebuilt = true
  })

  it('initializes a git repository for publishing', async function () {
    requireStep(this, steps.rushRebuilt)

    await ensureGitRepo({
      repoRoot: paths.repoRoot,
      env: npmEnv,
      logsRoot: paths.logsRoot
    })

    steps.gitReady = true
  })

  it('publishes packages to the local registry', async function () {
    requireStep(this, steps.gitReady)

    await runCommand(
      'rush',
      ['publish', '--apply', '--publish', '--include-all', '--registry', paths.registryUrl],
      {
        cwd: paths.repoRoot,
        env: npmEnv,
        logFile: path.join(paths.logsRoot, 'rush-publish.log')
      }
    )

    steps.packagesPublished = true
  })

  it('checks create-magek availability', async function () {
    requireStep(this, steps.packagesPublished)

    await ensureCreateMagekAvailable(paths.registryUrl, npmEnv, paths.logsRoot)
    steps.createMagekAvailable = true
  })

  it('scaffolds an app from the local registry', async function () {
    requireStep(this, steps.createMagekAvailable)

    const appName = `magek-plugin-e2e-${Date.now()}`
    const templatePath = path.join(paths.repoRoot, 'templates', 'default')

    if (!existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`)
    }

    appDir = await scaffoldApp({
      appRoot: paths.appRoot,
      appName,
      templatePath,
      description: 'CLI plugin E2E test app',
      registryUrl: paths.registryUrl,
      env: npmEnv,
      logsRoot: paths.logsRoot
    })

    expect(existsSync(appDir)).to.equal(true)
    steps.appScaffolded = true
  })

  it('installs app dependencies', async function () {
    requireStep(this, steps.appScaffolded)

    await installAppDependencies(appDir as string, npmEnv, paths.logsRoot)
    steps.appDependenciesInstalled = true
  })

  it('builds the generated app', async function () {
    requireStep(this, steps.appDependenciesInstalled)

    await buildApp(
      appDir as string,
      {
        ...npmEnv,
        MAGEK_ENV: 'local'
      },
      paths.logsRoot
    )

    steps.appBuilt = true
  })

  // --- CLI plugin tests ---

  describe('plugin loading', function () {
    it('lists plugins via the CLI', async function () {
      requireStep(this, steps.appBuilt)

      const result: RunCommandResult = await runCommand(
        'npx',
        ['magek', 'plugins'],
        {
          cwd: appDir as string,
          env: npmEnv,
          logFile: path.join(paths.logsRoot, 'magek-plugins-list.log')
        }
      )

      // The plugins command should succeed (exit code 0 is enforced by runCommand)
      expect(result.exitCode).to.equal(0)
      steps.pluginsListed = true
    })

    it('installs a plugin from the local registry', async function () {
      requireStep(this, steps.pluginsListed)

      await runCommand(
        'npx',
        ['magek', 'plugins:install', '@magek/adapter-event-store-nedb', '--registry', paths.registryUrl],
        {
          cwd: appDir as string,
          env: npmEnv,
          logFile: path.join(paths.logsRoot, 'magek-plugins-install.log')
        }
      )

      steps.pluginInstalled = true
    })

    it('shows the installed plugin in the plugins list', async function () {
      requireStep(this, steps.pluginInstalled)

      const result: RunCommandResult = await runCommand(
        'npx',
        ['magek', 'plugins'],
        {
          cwd: appDir as string,
          env: npmEnv,
          logFile: path.join(paths.logsRoot, 'magek-plugins-list-after-install.log')
        }
      )

      expect(result.stdout).to.include('@magek/adapter-event-store-nedb')
      steps.pluginVisible = true
    })
  })
})
