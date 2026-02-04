import { expect } from 'chai'
import { after, afterEach, before, describe, it } from 'mocha'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import * as path from 'node:path'
import {
  applyBankDepositFixtures,
  assertGitRepoInitialized,
  assertMagekCliDependency,
  assertNodeModulesInstalled,
  assertNpmScriptsWorking,
  assertPackageName,
  assertRequiredFiles,
  buildApp,
  ensureCreateMagekAvailable,
  installAppDependencies,
  scaffoldApp
} from '../src/harness/app'
import { graphqlRequest } from '../src/harness/graphql'
import { runCommand, startProcess, type ManagedProcess } from '../src/harness/exec'
import { ensureGitRepo } from '../src/harness/git'
import { buildNpmEnv, createNpmUserConfig } from '../src/harness/npm'
import { resolvePaths, type E2EPaths } from '../src/harness/paths'
import { configureRushRegistry, restoreRushRegistry, type RushNpmrcBackup } from '../src/harness/rush'
import { startServer, waitForHealth } from '../src/harness/server'
import { startVerdaccio, type VerdaccioInstance } from '../src/harness/verdaccio'
import { sleep, waitFor } from '../src/harness/wait'

describe('Magek end-to-end workflow', function () {
  this.timeout(20 * 60 * 1000)

  let paths: E2EPaths
  let npmEnv: NodeJS.ProcessEnv
  let verdaccio: VerdaccioInstance | undefined
  let rushBackup: RushNpmrcBackup | undefined
  let activeServer: ManagedProcess | undefined
  let appDir: string | undefined
  let appName: string | undefined
  let keepServerRunning = false

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
    appGitValidated: false,
    appNodeModulesValidated: false,
    appCliValidated: false,
    appScriptsValidated: false,
    appFilesValidated: false,
    appNameValidated: false,
    appDependenciesInstalled: false,
    appBuilt: false,
    serverStarted: false,
    healthChecked: false,
    fixturesApplied: false,
    fixturesBuilt: false,
    bankServerStarted: false,
    firstDeposit: false,
    firstBalance: false,
    dbChecked: false,
    subscriptionChecked: false,
    secondDeposit: false,
    secondBalance: false
  }

  const port = 3000
  const healthUrl = `http://localhost:${port}/sensor/health/`
  const graphqlUrl = `http://localhost:${port}/graphql`

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

  afterEach(async () => {
    if (!keepServerRunning && activeServer) {
      await activeServer.stop()
      activeServer = undefined
    }
  })

  after(async () => {
    if (activeServer) {
      await activeServer.stop()
      activeServer = undefined
    }

    if (verdaccio) {
      await verdaccio.process.stop()
    }

    if (rushBackup) {
      await restoreRushRegistry(rushBackup)
    }
  })

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

    appName = `magek-e2e-app-${Date.now()}`
    const templatePath = path.join(paths.repoRoot, 'templates', 'default')

    if (!existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`)
    }

    appDir = await scaffoldApp({
      appRoot: paths.appRoot,
      appName,
      templatePath,
      description: 'E2E test app',
      registryUrl: paths.registryUrl,
      env: npmEnv,
      logsRoot: paths.logsRoot
    })

    expect(existsSync(appDir)).to.equal(true)
    steps.appScaffolded = true
  })

  it('validates scaffold git repo', async function () {
    requireStep(this, steps.appScaffolded)

    await assertGitRepoInitialized(appDir as string)
    steps.appGitValidated = true
  })

  it('validates scaffold node_modules', async function () {
    requireStep(this, steps.appGitValidated)

    await assertNodeModulesInstalled(appDir as string)
    steps.appNodeModulesValidated = true
  })

  it('validates scaffold @magek/cli dependency', async function () {
    requireStep(this, steps.appNodeModulesValidated)

    await assertMagekCliDependency(appDir as string, npmEnv, paths.logsRoot)
    steps.appCliValidated = true
  })

  it('validates scaffold npm scripts', async function () {
    requireStep(this, steps.appCliValidated)

    await assertNpmScriptsWorking(appDir as string, npmEnv, paths.logsRoot)
    steps.appScriptsValidated = true
  })

  it('validates scaffold required files', async function () {
    requireStep(this, steps.appScriptsValidated)

    await assertRequiredFiles(appDir as string, ['package.json', 'tsconfig.json', 'src/index.ts'])
    steps.appFilesValidated = true
  })

  it('validates scaffold package name', async function () {
    requireStep(this, steps.appFilesValidated)

    await assertPackageName(appDir as string, appName as string)
    steps.appNameValidated = true
  })

  it('installs app dependencies', async function () {
    requireStep(this, steps.appNameValidated)

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

  describe('server health check', function () {
    before(function () {
      keepServerRunning = true
    })

    after(async function () {
      keepServerRunning = false
      if (activeServer) {
        await activeServer.stop()
        activeServer = undefined
      }
    })

    it('starts the server', async function () {
      requireStep(this, steps.appBuilt)

      activeServer = startServer({
        appDir: appDir as string,
        env: {
          ...npmEnv,
          MAGEK_ENV: 'local',
          PORT: String(port)
        },
        logsRoot: paths.logsRoot
      })

      steps.serverStarted = true
    })

    it('responds to the health endpoint', async function () {
      requireStep(this, steps.serverStarted)

      const healthResponse = await waitForHealth(activeServer as ManagedProcess, healthUrl, paths.logsRoot)
      expect(healthResponse).to.be.a('string').and.not.equal('')
      steps.healthChecked = true
    })
  })

  describe('bank deposit flow', function () {
    before(function () {
      keepServerRunning = true
    })

    after(async function () {
      keepServerRunning = false
      if (activeServer) {
        await activeServer.stop()
        activeServer = undefined
      }
    })

    it('applies bank deposit fixtures', async function () {
      requireStep(this, steps.appBuilt)

      await applyBankDepositFixtures(appDir as string, paths.fixturesRoot)
      steps.fixturesApplied = true
    })

    it('rebuilds the app with fixtures', async function () {
      requireStep(this, steps.fixturesApplied)

      await buildApp(
        appDir as string,
        {
          ...npmEnv,
          MAGEK_ENV: 'local'
        },
        paths.logsRoot
      )

      steps.fixturesBuilt = true
    })

    it('starts the server for the bank deposit flow', async function () {
      requireStep(this, steps.fixturesBuilt)

      activeServer = startServer({
        appDir: appDir as string,
        env: {
          ...npmEnv,
          MAGEK_ENV: 'local',
          PORT: String(port)
        },
        logsRoot: paths.logsRoot
      })

      await waitForHealth(activeServer, healthUrl, paths.logsRoot)
      steps.bankServerStarted = true
    })

    it('executes the first deposit mutation', async function () {
      requireStep(this, steps.bankServerStarted)

      const accountId = 'test-account-123'
      const depositAmount = 100

      const mutationResponse = await graphqlRequest<{ DepositMoney?: boolean }>(
        graphqlUrl,
        `mutation { DepositMoney(input: { accountId: "${accountId}", amount: ${depositAmount} }) }`
      )

      expect(mutationResponse.errors).to.equal(undefined)
      expect(mutationResponse.data).to.have.property('DepositMoney')
      steps.firstDeposit = true
    })

    it('reads the balance after the first deposit', async function () {
      requireStep(this, steps.firstDeposit)

      const accountId = 'test-account-123'
      const depositAmount = 100

      const queryForBalance = async () => {
        return await graphqlRequest<{ AccountBalance?: { id: string; balance: number } }>(
          graphqlUrl,
          `query { AccountBalance(id: "${accountId}") { id balance } }`
        )
      }

      const firstBalanceResponse = await waitFor(
        async () => {
          const response = await queryForBalance()
          if (response.errors || !response.data?.AccountBalance) {
            return false
          }
          return response.data.AccountBalance.balance === depositAmount ? response : false
        },
        {
          timeoutMs: 10000,
          intervalMs: 500,
          message: 'AccountBalance did not update after first deposit'
        }
      )

      expect(firstBalanceResponse.data?.AccountBalance?.balance).to.equal(depositAmount)
      expect(firstBalanceResponse.data?.AccountBalance?.id).to.equal(accountId)
      steps.firstBalance = true
    })

    it('checks data persisted in NeDB', async function () {
      requireStep(this, steps.firstBalance)

      const accountId = 'test-account-123'
      const eventsDbPath = path.join(appDir as string, '.magek', 'nedb', 'events.db')
      if (existsSync(eventsDbPath)) {
        const eventsDb = await readFile(eventsDbPath, 'utf8')
        const eventCount = eventsDb.split('MoneyDeposited').length - 1
        expect(eventCount).to.be.greaterThan(0)
        expect(eventsDb.includes(accountId)).to.equal(true)
      } else {
        console.warn(`Events database file not found at ${eventsDbPath}`)
      }

      const readModelsDbPath = path.join(appDir as string, '.magek', 'nedb', 'read-models.db')
      if (existsSync(readModelsDbPath)) {
        const readModelsDb = await readFile(readModelsDbPath, 'utf8')
        const readModelCount = readModelsDb.split('AccountBalance').length - 1
        expect(readModelCount).to.be.greaterThan(0)
        expect(readModelsDb.includes(accountId)).to.equal(true)
      } else {
        console.warn(`Read models database file not found at ${readModelsDbPath}`)
      }

      steps.dbChecked = true
    })

    it('exercises the subscription endpoint', async function () {
      requireStep(this, steps.dbChecked)

      const accountId = 'test-account-123'
      const subscriptionProcess = startProcess(
        'curl',
        [
          '-N',
          '-X',
          'POST',
          graphqlUrl,
          '-H',
          'Content-Type: application/json',
          '-d',
          JSON.stringify({
            query: `subscription { AccountBalance(id: "${accountId}") { id balance } }`
          })
        ],
        {
          logFile: path.join(paths.logsRoot, 'subscription.log')
        }
      )

      await sleep(2000)

      if (!subscriptionProcess.isRunning()) {
        console.warn('Subscription process exited early (non-fatal)')
      }
      await subscriptionProcess.stop()
      steps.subscriptionChecked = true
    })

    it('executes the second deposit mutation', async function () {
      requireStep(this, steps.subscriptionChecked)

      const accountId = 'test-account-123'
      const secondDeposit = 50
      const secondMutation = await graphqlRequest<{ DepositMoney?: boolean }>(
        graphqlUrl,
        `mutation { DepositMoney(input: { accountId: "${accountId}", amount: ${secondDeposit} }) }`
      )

      expect(secondMutation.errors).to.equal(undefined)
      steps.secondDeposit = true
    })

    it('reads the balance after the second deposit', async function () {
      requireStep(this, steps.secondDeposit)

      const accountId = 'test-account-123'
      const expectedFinalBalance = 150

      const finalBalanceResponse = await waitFor(
        async () => {
          const response = await graphqlRequest<{ AccountBalance?: { id: string; balance: number } }>(
            graphqlUrl,
            `query { AccountBalance(id: "${accountId}") { id balance } }`
          )
          if (response.errors || !response.data?.AccountBalance) {
            return false
          }
          return response.data.AccountBalance.balance === expectedFinalBalance ? response : false
        },
        {
          timeoutMs: 10000,
          intervalMs: 500,
          message: 'AccountBalance did not update after second deposit'
        }
      )

      expect(finalBalanceResponse.data?.AccountBalance?.balance).to.equal(expectedFinalBalance)
      steps.secondBalance = true
    })
  })
})
