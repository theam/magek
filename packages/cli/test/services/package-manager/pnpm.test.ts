import { fake } from 'sinon'
import { Effect, Layer, pipe } from 'effect'
import { expect } from '../../expect'
import { makeTestFileSystem } from '../file-system/test.impl'
import { makeTestProcess } from '../process/test.impl'
import { PnpmPackageManager } from '../../../src/services/package-manager/pnpm.impl'
import { guardError } from '../../../src/common/errors'
import { PackageManagerService } from '../../../src/services/package-manager'

const TestFileSystem = makeTestFileSystem()
const TestProcess = makeTestProcess()

const mapEffError = <A, R>(effect: Effect.Effect<A, { error: Error }, R>) =>
  pipe(
    effect,
    Effect.mapError((e) => e.error)
  )

describe('PackageManager - Pnpm Implementation', () => {
  it('run arbitrary scripts from package.json', async () => {
    const script = 'script'
    const args = ['arg1', 'arg2']
    const testLayer = Layer.merge(TestFileSystem.layer, TestProcess.layer)

    const effect = Effect.gen(function* () {
      const { runScript } = yield* PackageManagerService)
      return yield* runScript(script, args))
    })

    await Effect.runPromise(
      pipe(
        mapEffError(effect),
        Effect.provide(Layer.provide(PnpmPackageManager, testLayer)),
        Effect.orDieWith(guardError('An error ocurred')
    )
      )
    )
    expect(TestProcess.fakes.exec).to.have.been.calledWith(`pnpm run ${script} ${args.join(' ')}`)
  })

  describe('when the `compile` script exists', () => {
    const TestFileSystemWithCompileScript = makeTestFileSystem({
      readFileContents: fake.returns('{"scripts": {"compile": "tsc"}}'),
    })

    it('run the `compile` script', async () => {
      const testLayer = Layer.merge(TestFileSystemWithCompileScript.layer, TestProcess.layer)

      const effect = Effect.gen(function* () {
        const { build } = yield* PackageManagerService)
        return yield* build([]))
      })

      await Effect.runPromise(
      pipe(
        mapEffError(effect),
        Effect.provide(Layer.provide(PnpmPackageManager, testLayer)),
        Effect.orDieWith(guardError('An error ocurred')
      )
      )
    )
      expect(TestProcess.fakes.exec).to.have.been.calledWith('pnpm run compile')
    })
  })

  describe('when the `compile` script does not exist', () => {
    it('run the `build` script', async () => {
      const testLayer = Layer.merge(TestFileSystem.layer, TestProcess.layer)

      const effect = Effect.gen(function* () {
        const { build } = yield* PackageManagerService)
        return yield* build([]))
      })

      await Effect.runPromise(
      pipe(
        mapEffError(effect),
        Effect.provide(Layer.provide(PnpmPackageManager, testLayer)),
        Effect.orDieWith(guardError('An error ocurred')
      )
      )
    )
      expect(TestProcess.fakes.exec).to.have.been.calledWith('pnpm run build')
    })
  })

  it('can set the project root properly', async () => {
    const projectRoot = 'projectRoot'

    const CwdTestProcess = makeTestProcess({ cwd: fake.returns(projectRoot) })
    const testLayer = Layer.merge(TestFileSystem.layer, CwdTestProcess.layer)

    const effect = Effect.gen(function* () {
      const { setProjectRoot, runScript } = yield* PackageManagerService)
      yield* setProjectRoot(projectRoot))
      yield* runScript('script', []))
    })

    await Effect.runPromise(
      pipe(
        mapEffError(effect),
        Effect.provide(Layer.provide(PnpmPackageManager, testLayer)),
        Effect.orDieWith(guardError('An error ocurred')
    )
      )
    )
    expect(CwdTestProcess.fakes.exec).to.have.been.calledWith('pnpm run script', projectRoot)
  })

  it('can install production dependencies', async () => {
    const testLayer = Layer.merge(TestFileSystem.layer, TestProcess.layer)

    const effect = Effect.gen(function* () {
      const { installProductionDependencies } = yield* PackageManagerService)
      return yield* installProductionDependencies())
    })

    await Effect.runPromise(
      pipe(
        mapEffError(effect),
        Effect.provide(Layer.provide(PnpmPackageManager, testLayer)),
        Effect.orDieWith(guardError('An error ocurred')
    )
      )
    )

    expect(TestProcess.fakes.exec).to.have.been.calledWith('pnpm install --omit=dev --omit=optional --no-bin-links')
  })

  it('can install all dependencies', async () => {
    const testLayer = Layer.merge(TestFileSystem.layer, TestProcess.layer)

    const effect = Effect.gen(function* () {
      const { installAllDependencies } = yield* PackageManagerService)
      return yield* installAllDependencies())
    })

    await Effect.runPromise(
      pipe(
        mapEffError(effect),
        Effect.provide(Layer.provide(PnpmPackageManager, testLayer)),
        Effect.orDieWith(guardError('An error ocurred')
    )
      )
    )

    expect(TestProcess.fakes.exec).to.have.been.calledWith('pnpm install')
  })
})
