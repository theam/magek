import { fake } from 'sinon'
import { Effect, Layer, pipe } from 'effect'
import { expect } from '../../expect'
import { makeTestFileSystem } from '../file-system/test.impl'
import { makeTestProcess } from '../process/test.impl'
import { RushPackageManager } from '../../../src/services/package-manager/rush.impl'
import { guardError } from '../../../src/common/errors'
import { PackageManagerService } from '../../../src/services/package-manager'

const TestFileSystem = makeTestFileSystem()
const TestProcess = makeTestProcess()

const mapEffError = <A, R>(effect: Effect.Effect<A, { error: Error }, R>) =>
  pipe(
    effect,
    Effect.mapError((e: { error: Error }) => e.error)
  )

describe('PackageManager - Rush Implementation', () => {
  beforeEach(() => {
    TestFileSystem.reset()
    TestProcess.reset()
  })

  it('run arbitrary scripts from package.json', async () => {
    const script = 'script'
    const args = ['arg1', 'arg2']
    const testLayer = Layer.merge(TestFileSystem.layer, TestProcess.layer)

    const effect = Effect.gen(function* () {
      const { runScript } = yield* PackageManagerService
      return yield* runScript(script, args)
    })

    await Effect.runPromise(
      pipe(
        mapEffError(effect),
        Effect.provide(Layer.provide(RushPackageManager, testLayer)),
        Effect.orDieWith(guardError('An error ocurred'))
      )
    )
    expect(TestProcess.fakes.exec).to.have.been.calledWith(`rushx ${script} ${args.join(' ')}`)
  })

  it('runs the `build` script', async () => {
    const testLayer = Layer.merge(TestFileSystem.layer, TestProcess.layer)

    const effect = Effect.gen(function* () {
      const { build } = yield* PackageManagerService
      return yield* build([])
    })

    await Effect.runPromise(
      pipe(
        mapEffError(effect),
        Effect.provide(Layer.provide(RushPackageManager, testLayer)),
        Effect.orDieWith(guardError('An error ocurred'))
      )
    )
    expect(TestProcess.fakes.exec).to.have.been.calledWith('rush build')
  })

  it('can set the project root properly', async () => {
    const projectRoot = 'projectRoot'

    const CwdTestProcess = makeTestProcess({ cwd: fake.returns(projectRoot) })
    const testLayer = Layer.merge(TestFileSystem.layer, CwdTestProcess.layer)

    const effect = Effect.gen(function* () {
      const { setProjectRoot, runScript } = yield* PackageManagerService
      yield* setProjectRoot(projectRoot)
      yield* runScript('script', [])
    })

    await Effect.runPromise(
      pipe(
        mapEffError(effect),
        Effect.provide(Layer.provide(RushPackageManager, testLayer)),
        Effect.orDieWith(guardError('An error ocurred'))
      )
    )
    expect(CwdTestProcess.fakes.exec).to.have.been.calledWith('rushx script', projectRoot)
  })

  it('cannot install production dependencies', async () => {
    const testLayer = Layer.merge(TestFileSystem.layer, TestProcess.layer)

    const effect = Effect.gen(function* () {
      const { installProductionDependencies } = yield* PackageManagerService
      return yield* installProductionDependencies()
    })

    return expect(
      Effect.runPromise(
        pipe(
          mapEffError(effect),
          Effect.provide(Layer.provide(RushPackageManager, testLayer)),
          Effect.orDieWith(guardError('An error ocurred'))
        )
      )
    ).to.be.eventually.rejected
  })

  it('can install all dependencies', async () => {
    const testLayer = Layer.merge(TestFileSystem.layer, TestProcess.layer)

    const effect = Effect.gen(function* () {
      const { installAllDependencies } = yield* PackageManagerService
      return yield* installAllDependencies()
    })

    await Effect.runPromise(
      pipe(
        mapEffError(effect),
        Effect.provide(Layer.provide(RushPackageManager, testLayer)),
        Effect.orDieWith(guardError('An error ocurred'))
      )
    )

    expect(TestProcess.fakes.exec).to.have.been.calledWith('rush update')
  })
})
