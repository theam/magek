import * as path from 'node:path'
import { startProcess, type ManagedProcess } from './exec'
import { waitFor } from './wait'

export interface VerdaccioInstance {
  process: ManagedProcess
  registryUrl: string
}

export interface VerdaccioOptions {
  configPath: string
  registryUrl: string
  logsRoot: string
  env?: NodeJS.ProcessEnv
}

export const startVerdaccio = async (options: VerdaccioOptions): Promise<VerdaccioInstance> => {
  const logFile = path.join(options.logsRoot, 'verdaccio.log')
  const process = startProcess('verdaccio', ['--config', options.configPath], {
    env: options.env,
    logFile
  })

  await waitFor(
    async () => {
      if (!process.isRunning()) {
        throw new Error(`Verdaccio exited early. Logs: ${logFile}`)
      }

      const response = await fetch(options.registryUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(1000)
      })
      return response.ok
    },
    {
      timeoutMs: 30000,
      intervalMs: 500,
      message: `Verdaccio did not become healthy. Logs: ${logFile}`
    }
  )

  return { process, registryUrl: options.registryUrl }
}
