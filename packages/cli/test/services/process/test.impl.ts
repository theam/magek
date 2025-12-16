import { ProcessService } from '../../../src/services/process/index.js'
import { fake, type SinonSpy } from 'sinon'

type ProcessFakes = {
  cwd: SinonSpy<[], string>
  exec: SinonSpy<[string, (string | undefined)?], Promise<string>>
}

export const makeTestProcess = (overrides?: Partial<ProcessFakes>) => {
  const fakes: ProcessFakes = {
    cwd: overrides?.cwd ?? fake.returns(''),
    exec: overrides?.exec ?? fake.resolves(''),
  }

  const service: ProcessService = {
    cwd: () => fakes.cwd(),
    exec: async (command: string, cwd?: string) => fakes.exec(command, cwd),
  }

  const reset = () => {
    fakes.cwd.resetHistory()
    fakes.exec.resetHistory()
  }

  return { service, fakes, reset }
}
