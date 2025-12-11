import { fake } from 'sinon'
import { Effect, Layer, pipe } from 'effect'
import { expect } from '../../expect.js'
import { makeTestFileSystem } from '../file-system/test.impl.js'
import { makeTestProcess } from '../process/test.impl.js'
import { PackageManagerService } from '../../../src/services/package-manager/index.js'
import { InferredPackageManager } from '../../../src/services/package-manager/live.impl.js'
import { guardError } from '../../../src/common/errors.js'

describe('PackageManager - Live Implementation (with inference)', () => {
  const TestProcess = makeTestProcess()

  afterEach(() => {
    TestProcess.reset()
  })

  const effect = Effect.gen(function* () {
    const { runScript } = yield* PackageManagerService
    return yield* runScript('script', [])
  })

  const runScript = pipe(
    effect,
    Effect.mapError((e) => e.error)
  )

  it('infers Rush when a `.rush` folder is present', async () => {
    const TestFileSystem = makeTestFileSystem({ readDirectoryContents: fake.resolves(['.rush']) })
    const testLayer = Layer.merge(TestFileSystem.layer, TestProcess.layer)
    await Effect.runPromise(
      pipe(
        runScript,
        Effect.provide(Layer.provide(InferredPackageManager, testLayer)),
        Effect.orDieWith(guardError('An error ocurred'))
      )
    )
    expect(TestProcess.fakes.exec).to.have.been.calledWith('rushx script')
  })

  it('infers pnpm when a `pnpm-lock.yaml` file is present', async () => {
    const TestFileSystem = makeTestFileSystem({ readDirectoryContents: fake.resolves(['pnpm-lock.yaml']) })
    const testLayer = Layer.merge(TestFileSystem.layer, TestProcess.layer)
    await Effect.runPromise(
      pipe(
        runScript,
        Effect.provide(Layer.provide(InferredPackageManager, testLayer)),
        Effect.orDieWith(guardError('An error ocurred'))
      )
    )
    expect(TestProcess.fakes.exec).to.have.been.calledWith('pnpm run script')
  })

  it('infers npm when a `package-lock.json` file is present', async () => {
    const TestFileSystem = makeTestFileSystem({ readDirectoryContents: fake.resolves(['package-lock.json']) })
    const testLayer = Layer.merge(TestFileSystem.layer, TestProcess.layer)
    await Effect.runPromise(
      pipe(
        runScript,
        Effect.provide(Layer.provide(InferredPackageManager, testLayer)),
        Effect.orDieWith(guardError('An error ocurred'))
      )
    )
    expect(TestProcess.fakes.exec).to.have.been.calledWith('npm run script')
  })

  it('infers yarn when a `yarn.lock` file is present', async () => {
    const TestFileSystem = makeTestFileSystem({ readDirectoryContents: fake.resolves(['yarn.lock']) })
    const testLayer = Layer.merge(TestFileSystem.layer, TestProcess.layer)
    await Effect.runPromise(
      pipe(
        runScript,
        Effect.provide(Layer.provide(InferredPackageManager, testLayer)),
        Effect.orDieWith(guardError('An error ocurred'))
      )
    )
    expect(TestProcess.fakes.exec).to.have.been.calledWith('yarn run script')
  })

  it('infers npm when no lock file is present', async () => {
    const TestFileSystem = makeTestFileSystem({ readDirectoryContents: fake.resolves([]) })
    const testLayer = Layer.merge(TestFileSystem.layer, TestProcess.layer)
    await Effect.runPromise(
      pipe(
        runScript,
        Effect.provide(Layer.provide(InferredPackageManager, testLayer)),
        Effect.orDieWith(guardError('An error ocurred'))
      )
    )
    expect(TestProcess.fakes.exec).to.have.been.calledWith('npm run script')
  })
})
