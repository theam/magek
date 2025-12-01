import { fakeService, type FakeOverrides } from '../../helpers/effect.js'
import { fake } from 'sinon'
import { PackageManagerService } from '../../../src/services/package-manager/index.js'

export const makeTestPackageManager = (overrides?: FakeOverrides<PackageManagerService>) =>
  fakeService(PackageManagerService, {
    setProjectRoot: fake(),
    runScript: fake.returns(''),
    build: fake.returns(''),
    installAllDependencies: fake(),
    installProductionDependencies: fake(),
    ...overrides,
  })
