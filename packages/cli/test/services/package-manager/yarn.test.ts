import { fake } from 'sinon'
import { expect } from '../../expect.js'
import { makeTestFileSystem } from '../file-system/test.impl.js'
import { makeTestProcess } from '../process/test.impl.js'
import { createYarnPackageManager } from '../../../src/services/package-manager/yarn.impl.js'

const TestFileSystem = makeTestFileSystem()
const TestProcess = makeTestProcess()

describe('PackageManager - Yarn Implementation', () => {
  beforeEach(() => {})

  it('run arbitrary scripts from package.json', async () => {
    const script = 'script'
    const args = ['arg1', 'arg2']
    const packageManager = createYarnPackageManager({
      processService: TestProcess.service,
      fileSystemService: TestFileSystem.service,
    })

    await packageManager.runScript(script, args)

    expect(TestProcess.fakes.exec).to.have.been.calledWith(`yarn run ${script} ${args.join(' ')}`)
  })

  describe('when the `compile` script exists', () => {
    const TestFileSystemWithCompileScript = makeTestFileSystem({
      readFileContents: fake.resolves('{"scripts": {"compile": "tsc"}}'),
    })

    it('run the `compile` script', async () => {
      const packageManager = createYarnPackageManager({
        processService: TestProcess.service,
        fileSystemService: TestFileSystemWithCompileScript.service,
      })

      await packageManager.build([])

      expect(TestProcess.fakes.exec).to.have.been.calledWith('yarn run compile')
    })
  })

  describe('when the `compile` script does not exist', () => {
    it('run the `build` script', async () => {
      const packageManager = createYarnPackageManager({
        processService: TestProcess.service,
        fileSystemService: TestFileSystem.service,
      })

      await packageManager.build([])

      expect(TestProcess.fakes.exec).to.have.been.calledWith('yarn run build')
    })
  })

  it('can set the project root properly', async () => {
    const projectRoot = 'projectRoot'
    const CwdTestProcess = makeTestProcess({ cwd: fake.returns(projectRoot) })
    const packageManager = createYarnPackageManager({
      processService: CwdTestProcess.service,
      fileSystemService: TestFileSystem.service,
    })

    packageManager.setProjectRoot(projectRoot)
    await packageManager.runScript('script', [])

    expect(CwdTestProcess.fakes.exec).to.have.been.calledWith('yarn run script', projectRoot)
  })

  it('can install production dependencies', async () => {
    const packageManager = createYarnPackageManager({
      processService: TestProcess.service,
      fileSystemService: TestFileSystem.service,
    })

    await packageManager.installProductionDependencies()

    expect(TestProcess.fakes.exec).to.have.been.calledWith('yarn install --omit=dev --omit=optional --no-bin-links')
  })

  it('can install all dependencies', async () => {
    const packageManager = createYarnPackageManager({
      processService: TestProcess.service,
      fileSystemService: TestFileSystem.service,
    })

    await packageManager.installAllDependencies()

    expect(TestProcess.fakes.exec).to.have.been.calledWith('yarn install')
  })
})
