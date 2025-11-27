import { ProcessService } from '../../../src/services/process/index.ts'
import { fake } from 'sinon'
import { fakeService, type FakeOverrides } from '../../helpers/effect.ts'

export const makeTestProcess = (overrides?: FakeOverrides<ProcessService>) =>
  fakeService(ProcessService, {
    cwd: fake.returns(''),
    exec: fake.returns(''),
    ...overrides,
  })
