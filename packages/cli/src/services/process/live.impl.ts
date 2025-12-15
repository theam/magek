import { ProcessService, ProcessError } from './index.js'

type ExecaCommandFn = (command: string, options?: { cwd?: string }) => Promise<{ stdout: string; stderr: string }>

const lazyExecaCommand = async (command: string, options?: { cwd?: string }) => {
  const { execaCommand } = await import('execa')
  return execaCommand(command, options)
}

const unknownToError = (e: unknown): Error =>
  e instanceof Error ? e : new Error(String(e))

export const createProcessService = (execaCommand: ExecaCommandFn = lazyExecaCommand): ProcessService => ({
  exec: async (command: string, cwd?: string): Promise<string> => {
    try {
      const { stdout, stderr } = await execaCommand(command, { cwd })
      return `\n${stderr ? `There were some issues running the command: ${stderr}\n` : ''}\n${stdout}\n`
    } catch (reason: unknown) {
      throw new ProcessError('Failed to execute command', unknownToError(reason))
    }
  },
  cwd: (): string => {
    try {
      return process.cwd()
    } catch (reason: unknown) {
      throw new ProcessError('Failed to get current working directory', unknownToError(reason))
    }
  },
})

export const liveProcessService = createProcessService()
