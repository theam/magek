import { FakeOverrides, fakeService } from '../../helpers/effect'
import { fake } from 'sinon'
import { PackageManagerService } from '../../../src/services/package-manager'

export const makeTestPackageManager = (overrides?: FakeOverrides<PackageManagerService>) =>
  fakeService(PackageManagerService, {
    setProjectRoot: fake(),
    runScript: fake.returns(''),
    build: fake.returns(''),
    installAllDependencies: fake(),
    installProductionDependencies: fake(),
    ...overrides,
  })
