import { fake } from 'sinon'
import { expect } from '../../expect.js'
import { makeTestFileSystem } from '../file-system/test.impl.js'
import { makeTestProcess } from '../process/test.impl.js'
import { createRushPackageManager } from '../../../src/services/package-manager/rush.impl.js'

const TestFileSystem = makeTestFileSystem()
const TestProcess = makeTestProcess()

describe('PackageManager - Rush Implementation', () => {
  beforeEach(() => {
    TestFileSystem.reset()
    TestProcess.reset()
  })

  it('run arbitrary scripts from package.json', async () => {
    const script = 'script'
    const args = ['arg1', 'arg2']
    const packageManager = createRushPackageManager({
      processService: TestProcess.service,
      fileSystemService: TestFileSystem.service,
    })

    await packageManager.runScript(script, args)

    expect(TestProcess.fakes.exec).to.have.been.calledWith(`rushx ${script} ${args.join(' ')}`)
  })

  it('runs the `build` script', async () => {
    const packageManager = createRushPackageManager({
      processService: TestProcess.service,
      fileSystemService: TestFileSystem.service,
    })

    await packageManager.build([])

    expect(TestProcess.fakes.exec).to.have.been.calledWith('rush build')
  })

  it('can set the project root properly', async () => {
    const projectRoot = 'projectRoot'
    const CwdTestProcess = makeTestProcess({ cwd: fake.returns(projectRoot) })
    const packageManager = createRushPackageManager({
      processService: CwdTestProcess.service,
      fileSystemService: TestFileSystem.service,
    })

    packageManager.setProjectRoot(projectRoot)
    await packageManager.runScript('script', [])

    expect(CwdTestProcess.fakes.exec).to.have.been.calledWith('rushx script', projectRoot)
  })

  it('cannot install production dependencies', async () => {
    const packageManager = createRushPackageManager({
      processService: TestProcess.service,
      fileSystemService: TestFileSystem.service,
    })

    await expect(packageManager.installProductionDependencies()).to.be.eventually.rejected
  })

  it('can install all dependencies', async () => {
    const packageManager = createRushPackageManager({
      processService: TestProcess.service,
      fileSystemService: TestFileSystem.service,
    })

    await packageManager.installAllDependencies()

    expect(TestProcess.fakes.exec).to.have.been.calledWith('rush update')
  })
})
