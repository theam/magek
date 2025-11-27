import * as process from 'process'
import { ProcessError, ProcessService } from './index.ts'
import { Effect, Layer } from 'effect'
import { unknownToError } from '../../common/errors.ts'

type ExecaCommandFn = typeof import('execa').execaCommand

const resolveExecaCommand = async () => (await import('execa')).execaCommand

const lazyExecaCommand: ExecaCommandFn = ((command: string, options?: Parameters<ExecaCommandFn>[1]) =>
  resolveExecaCommand().then((fn) => fn(command, options))) as ExecaCommandFn

export const makeLiveProcess = (execaCommand: ExecaCommandFn) =>
  Layer.succeed(ProcessService, {
    exec: (command: string, cwd?: string) =>
      Effect.tryPromise({
        try: async () => {
          const { stdout, stderr } = await execaCommand(command, { cwd })
          return `
${stderr ? `There were some issues running the command: ${stderr}\n` : ''}
${stdout}
`
        },
        catch: (reason: unknown) => new ProcessError(unknownToError(reason)),
      }),
    cwd: () =>
      Effect.try({
        try: () => process.cwd(),
        catch: (reason: unknown) => new ProcessError(unknownToError(reason)),
      }),
  })

export const LiveProcess = makeLiveProcess(lazyExecaCommand)
