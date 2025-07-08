import type { execaCommand as ExecaCommandFn } from 'execa'
import { execaCommand as defaultExecaCommand } from 'execa'
import * as process from 'process'
import { ProcessError, ProcessService } from './index.js'
import { Effect, Layer } from 'effect'
import { unknownToError } from '../../common/errors.js'

export const makeLiveProcess = (execaCommand: typeof ExecaCommandFn) =>
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

export const LiveProcess = makeLiveProcess(defaultExecaCommand)
