import { fake } from 'sinon'
import { expect } from '../../expect.js'
import { makeTestFileSystem } from '../file-system/test.impl.js'
import { makeTestProcess } from '../process/test.impl.js'
import { inferPackageManagerFromDirectoryContents } from '../../../src/services/package-manager/live.impl.js'

describe('PackageManager - Live Implementation (with inference)', () => {
  const TestProcess = makeTestProcess()

  afterEach(() => {
    TestProcess.reset()
  })

  it('infers Rush when a `.rush` folder is present', async () => {
    const TestFileSystem = makeTestFileSystem({ readDirectoryContents: fake.resolves(['.rush']) })
    const factory = await inferPackageManagerFromDirectoryContents(TestProcess.service, TestFileSystem.service)
    const packageManager = factory({ processService: TestProcess.service, fileSystemService: TestFileSystem.service })

    await packageManager.runScript('script', [])
    expect(TestProcess.fakes.exec).to.have.been.calledWith('rushx script')
  })

  it('infers pnpm when a `pnpm-lock.yaml` file is present', async () => {
    const TestFileSystem = makeTestFileSystem({ readDirectoryContents: fake.resolves(['pnpm-lock.yaml']) })
    const factory = await inferPackageManagerFromDirectoryContents(TestProcess.service, TestFileSystem.service)
    const packageManager = factory({ processService: TestProcess.service, fileSystemService: TestFileSystem.service })

    await packageManager.runScript('script', [])
    expect(TestProcess.fakes.exec).to.have.been.calledWith('pnpm run script')
  })

  it('infers npm when a `package-lock.json` file is present', async () => {
    const TestFileSystem = makeTestFileSystem({ readDirectoryContents: fake.resolves(['package-lock.json']) })
    const factory = await inferPackageManagerFromDirectoryContents(TestProcess.service, TestFileSystem.service)
    const packageManager = factory({ processService: TestProcess.service, fileSystemService: TestFileSystem.service })

    await packageManager.runScript('script', [])
    expect(TestProcess.fakes.exec).to.have.been.calledWith('npm run script')
  })

  it('infers yarn when a `yarn.lock` file is present', async () => {
    const TestFileSystem = makeTestFileSystem({ readDirectoryContents: fake.resolves(['yarn.lock']) })
    const factory = await inferPackageManagerFromDirectoryContents(TestProcess.service, TestFileSystem.service)
    const packageManager = factory({ processService: TestProcess.service, fileSystemService: TestFileSystem.service })

    await packageManager.runScript('script', [])
    expect(TestProcess.fakes.exec).to.have.been.calledWith('yarn run script')
  })

  it('infers npm when no lock file is present', async () => {
    const TestFileSystem = makeTestFileSystem({ readDirectoryContents: fake.resolves([]) })
    const factory = await inferPackageManagerFromDirectoryContents(TestProcess.service, TestFileSystem.service)
    const packageManager = factory({ processService: TestProcess.service, fileSystemService: TestFileSystem.service })

    await packageManager.runScript('script', [])
    expect(TestProcess.fakes.exec).to.have.been.calledWith('npm run script')
  })
})
