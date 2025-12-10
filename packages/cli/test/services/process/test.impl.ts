import { ProcessService } from '../../../src/services/process/index.js'
import { fake, type SinonSpy } from 'sinon'
import { Layer } from 'effect'

type ProcessFakes = {
  cwd: SinonSpy<[], string | Promise<string>>
  exec: SinonSpy<[string, (string | undefined)?], string | Promise<string>>
}

export const makeTestProcess = (overrides?: Partial<ProcessFakes>) => {
  const fakes: ProcessFakes = {
    cwd: overrides?.cwd ?? fake.resolves(''),
    exec: overrides?.exec ?? fake.resolves(''),
  }

  const layer = Layer.succeed(ProcessService, {
    cwd: async () => fakes.cwd(),
    exec: async (command: string, cwd?: string) => fakes.exec(command, cwd),
  })

  const reset = () => {
    fakes.cwd.resetHistory()
    fakes.exec.resetHistory()
  }

  return { layer, fakes, reset }
}
