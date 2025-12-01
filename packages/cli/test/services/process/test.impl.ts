import { ProcessService } from '../../../src/services/process/index.js'
import { fake } from 'sinon'
import { fakeService, type FakeOverrides } from '../../helpers/effect.js'

export const makeTestProcess = (overrides?: FakeOverrides<ProcessService>) =>
  fakeService(ProcessService, {
    cwd: fake.returns(''),
    exec: fake.returns(''),
    ...overrides,
  })
