import * as process from 'process'
import { ProcessError, ProcessService } from './index.js'
import { Layer } from 'effect'
import { unknownToError } from '../../common/errors.js'

type ExecaCommandFn = typeof import('execa').execaCommand

const resolveExecaCommand = async () => (await import('execa')).execaCommand

const lazyExecaCommand: ExecaCommandFn = ((command: string, options?: Parameters<ExecaCommandFn>[1]) =>
  resolveExecaCommand().then((fn) => fn(command, options))) as ExecaCommandFn

export const makeLiveProcess = (execaCommand: ExecaCommandFn) =>
  Layer.succeed(ProcessService, {
    exec: async (command: string, cwd?: string) => {
      try {
        const { stdout, stderr } = await execaCommand(command, { cwd })
        return `
${stderr ? `There were some issues running the command: ${stderr}\n` : ''}
${stdout}
`
      } catch (reason) {
        throw new ProcessError(unknownToError(reason))
      }
    },
    cwd: async () => {
      try {
        return process.cwd()
      } catch (reason) {
        throw new ProcessError(unknownToError(reason))
      }
    },
  })

export const LiveProcess = makeLiveProcess(lazyExecaCommand)
