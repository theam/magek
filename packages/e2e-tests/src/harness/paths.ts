import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'

export interface E2EPaths {
  repoRoot: string
  appRoot: string
  fixturesRoot: string
  verdaccioConfigPath: string
  logsRoot: string
  registryUrl: string
}

const findRepoRoot = (startDir: string): string => {
  let current = startDir
  while (true) {
    if (existsSync(path.join(current, 'rush.json'))) {
      return current
    }
    const parent = path.dirname(current)
    if (parent === current) {
      throw new Error('Unable to find repo root (rush.json)')
    }
    current = parent
  }
}

const resolveAppRoot = async (): Promise<string> => {
  const configured = process.env.E2E_APP_ROOT
  if (configured) {
    await mkdir(configured, { recursive: true })
    return configured
  }

  const preferred = '/work'
  if (existsSync(preferred)) {
    await mkdir(preferred, { recursive: true })
    return preferred
  }

  const fallback = path.join(os.tmpdir(), 'magek-e2e-apps')
  await mkdir(fallback, { recursive: true })
  return fallback
}

const resolveLogsRoot = async (): Promise<string> => {
  const configured = process.env.E2E_LOG_DIR
  if (configured) {
    await mkdir(configured, { recursive: true })
    return configured
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const logsRoot = path.join(os.tmpdir(), `magek-e2e-logs-${timestamp}`)
  await mkdir(logsRoot, { recursive: true })
  return logsRoot
}

export const resolvePaths = async (): Promise<E2EPaths> => {
  const repoRoot = findRepoRoot(process.cwd())
  const appRoot = await resolveAppRoot()
  const logsRoot = await resolveLogsRoot()
  const fixturesRoot =
    process.env.E2E_FIXTURES_DIR ?? path.join(repoRoot, 'packages', 'e2e-tests', 'fixtures')
  const verdaccioConfigPath =
    process.env.E2E_VERDACCIO_CONFIG ?? path.join(repoRoot, 'e2e', 'verdaccio-config.yaml')
  const registryUrl = process.env.E2E_REGISTRY_URL ?? 'http://localhost:4873'

  return {
    repoRoot,
    appRoot,
    fixturesRoot,
    verdaccioConfigPath,
    logsRoot,
    registryUrl
  }
}
