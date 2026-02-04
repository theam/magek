import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { once } from 'node:events'

export interface RunCommandOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  logFile?: string
}

export interface RunCommandResult {
  command: string
  args: string[]
  exitCode: number
  stdout: string
  stderr: string
}

const MAX_BUFFER = 12000

const appendLimited = (value: string, chunk: string): string => {
  const next = value + chunk
  return next.length > MAX_BUFFER ? next.slice(-MAX_BUFFER) : next
}

export const runCommand = async (
  command: string,
  args: string[],
  options: RunCommandOptions = {}
): Promise<RunCommandResult> => {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''
    const logStream = options.logFile ? createWriteStream(options.logFile, { flags: 'a' }) : null

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        const chunk = data.toString()
        stdout = appendLimited(stdout, chunk)
        logStream?.write(chunk)
      })
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        const chunk = data.toString()
        stderr = appendLimited(stderr, chunk)
        logStream?.write(chunk)
      })
    }

    child.on('error', (error) => {
      logStream?.end()
      reject(error)
    })

    child.on('close', (exitCode, signal) => {
      logStream?.end()
      if (exitCode !== 0 || exitCode === null) {
        const logHint = options.logFile ? ` Logs: ${options.logFile}` : ''
        reject(
          new Error(
            `Command failed (${exitCode ?? 'null'}${signal ? `, signal ${signal}` : ''}): ${command} ${args.join(' ')}\n` +
              `stdout: ${stdout}\n` +
              `stderr: ${stderr}${logHint}`
          )
        )
        return
      }

      resolve({
        command,
        args,
        exitCode: exitCode ?? 0,
        stdout,
        stderr
      })
    })
  })
}

export interface ManagedProcess {
  command: string
  args: string[]
  pid?: number
  logFile: string
  isRunning: () => boolean
  stop: (signal?: NodeJS.Signals) => Promise<void>
}

export const startProcess = (
  command: string,
  args: string[],
  options: RunCommandOptions & { logFile: string }
): ManagedProcess => {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  const logStream = createWriteStream(options.logFile, { flags: 'a' })

  if (child.stdout) {
    child.stdout.on('data', (data) => logStream.write(data))
  }
  if (child.stderr) {
    child.stderr.on('data', (data) => logStream.write(data))
  }

  const isRunning = (): boolean => {
    return child.exitCode === null && !child.killed
  }

  const stop = async (signal: NodeJS.Signals = 'SIGTERM'): Promise<void> => {
    if (!isRunning()) {
      logStream.end()
      return
    }

    child.kill(signal)

    const timeout = setTimeout(() => {
      if (isRunning()) {
        child.kill('SIGKILL')
      }
    }, 5000)

    try {
      await once(child, 'close')
    } finally {
      clearTimeout(timeout)
      logStream.end()
    }
  }

  return {
    command,
    args,
    pid: child.pid,
    logFile: options.logFile,
    isRunning,
    stop
  }
}
