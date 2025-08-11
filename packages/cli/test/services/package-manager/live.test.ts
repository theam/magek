import { fake, replace, restore } from 'sinon'
import { Effect, Layer, pipe } from 'effect'
import { expect } from '../../expect'
import { makeTestFileSystem } from '../file-system/test.impl'
import { makeTestProcess } from '../process/test.impl'
import { PackageManagerService } from '../../../src/services/package-manager'
import { InferredPackageManager } from '../../../src/services/package-manager/live.impl'
import { guardError } from '../../../src/common/errors'
import * as fs from 'fs'

describe('PackageManager - Live Implementation (with inference)', () => {
  const TestProcess = makeTestProcess()

  afterEach(() => {
    TestProcess.reset()
    restore()
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
    replace(fs.promises, 'readdir', fake.resolves(['.rush']))
    const TestFileSystem = makeTestFileSystem()
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
    replace(fs.promises, 'readdir', fake.resolves(['pnpm-lock.yaml']))
    const TestFileSystem = makeTestFileSystem()
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
    replace(fs.promises, 'readdir', fake.resolves(['package-lock.json']))
    const TestFileSystem = makeTestFileSystem()
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
    replace(fs.promises, 'readdir', fake.resolves(['yarn.lock']))
    const TestFileSystem = makeTestFileSystem()
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
    replace(fs.promises, 'readdir', fake.resolves([]))
    const TestFileSystem = makeTestFileSystem()
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
