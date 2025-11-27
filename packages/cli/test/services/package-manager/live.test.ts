import { fake } from 'sinon'
import { Effect, Layer, pipe } from 'effect'
import { expect } from '../../expect.ts'
import { makeTestFileSystem } from '../file-system/test.impl.ts'
import { makeTestProcess } from '../process/test.impl.ts'
import { PackageManagerService } from '../../../src/services/package-manager/index.ts'
import { InferredPackageManager } from '../../../src/services/package-manager/live.impl.ts'
import { guardError } from '../../../src/common/errors.ts'

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
    const TestFileSystem = makeTestFileSystem({ readDirectoryContents: fake.returns(['.rush']) })
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
    const TestFileSystem = makeTestFileSystem({ readDirectoryContents: fake.returns(['pnpm-lock.yaml']) })
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
    const TestFileSystem = makeTestFileSystem({ readDirectoryContents: fake.returns(['package-lock.json']) })
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
    const TestFileSystem = makeTestFileSystem({ readDirectoryContents: fake.returns(['yarn.lock']) })
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
    const TestFileSystem = makeTestFileSystem({ readDirectoryContents: fake.returns([]) })
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
