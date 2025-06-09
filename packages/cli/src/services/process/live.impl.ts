import * as execa from 'execa'
import * as process from 'process'
import { ProcessError, ProcessService } from '.'
import { Effect, Layer } from 'effect'
import { unknownToError } from '../../common/errors'

const exec = (command: string, cwd?: string) =>
  Effect.tryPromise({
    try: async () => {
      const { stdout, stderr } = await execa.command(command, { cwd })
      const result = `
${stderr ? `There were some issues running the command: ${stderr}\n` : ''}
${stdout}
`
      return result
    },
    catch: (reason) => new ProcessError(unknownToError(reason))
  })

const cwd = () =>
  Effect.try({
    try: () => process.cwd(),
    catch: (reason) => new ProcessError(unknownToError(reason))
  })

export const LiveProcess = Layer.succeed(ProcessService, { exec, cwd })
