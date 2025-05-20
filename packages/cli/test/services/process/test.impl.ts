import { ProcessService } from '../../../src/services/process'
import { fake } from 'sinon'
import { FakeOverrides, fakeService } from '../../helpers/effect'

export const makeTestProcess = (overrides?: FakeOverrides<ProcessService>) =>
  fakeService(ProcessService, {
    cwd: fake.returns(''),
    exec: fake.returns(''),
    ...overrides,
  })
