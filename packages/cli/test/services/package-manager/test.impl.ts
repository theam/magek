import { fakeService, type FakeOverrides } from '../../helpers/effect.ts'
import { fake } from 'sinon'
import { PackageManagerService } from '../../../src/services/package-manager/index.ts'

export const makeTestPackageManager = (overrides?: FakeOverrides<PackageManagerService>) =>
  fakeService(PackageManagerService, {
    setProjectRoot: fake(),
    runScript: fake.returns(''),
    build: fake.returns(''),
    installAllDependencies: fake(),
    installProductionDependencies: fake(),
    ...overrides,
  })
