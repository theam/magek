import * as path from 'node:path'
import { startProcess, type ManagedProcess } from './exec'
import { waitFor } from './wait'

export interface ServerOptions {
  appDir: string
  env: NodeJS.ProcessEnv
  logsRoot: string
}

export const startServer = (options: ServerOptions): ManagedProcess => {
  const logFile = path.join(options.logsRoot, 'magek-server.log')
  return startProcess('npm', ['run', 'start'], {
    cwd: options.appDir,
    env: options.env,
    logFile
  })
}

export const waitForHealth = async (
  serverProcess: ManagedProcess,
  healthUrl: string,
  logsRoot: string
): Promise<string> => {
  const logFile = path.join(logsRoot, 'magek-server.log')
  return await waitFor(
    async () => {
      if (!serverProcess.isRunning()) {
        throw new Error(`Server exited unexpectedly. Logs: ${logFile}`)
      }

      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1000) })
      if (!response.ok) {
        return false
      }

      const text = await response.text()
      return text ? text : false
    },
    {
      timeoutMs: 30000,
      intervalMs: 1000,
      message: `Server did not become healthy. Logs: ${logFile}`
    }
  )
}
