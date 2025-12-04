import { fake, replace, restore } from 'sinon'
import { Effect, pipe } from 'effect'
import { makeLiveProcess, LiveProcess } from '../../../src/services/process/live.impl.js'
import { expect } from '../../expect.js'
import { guardError } from '../../../src/common/errors.js'
import { ProcessService } from '../../../src/services/process/index.js'

describe('Process - Live Implementation', () => {
  beforeEach(() => {
    replace(process, 'cwd', fake.returns(''))
  })

  afterEach(() => {
    restore()
  })

  const mapEffError = <A, R>(effect: Effect.Effect<A, { error: Error }, R>) =>
    pipe(
      effect,
      Effect.mapError((e: { error: Error }) => e.error)
    )

  it('uses process.cwd', async () => {
    const effect = Effect.gen(function* () {
      const { cwd } = yield* ProcessService
      return yield* cwd()
    })
    await Effect.runPromise(
      pipe(
        mapEffError(effect), 
        Effect.provide(LiveProcess),
        Effect.orDieWith(guardError('An error ocurred'))
      )
    )
    expect(process.cwd).to.have.been.called
  })

  it('uses execa.command', async () => {
    const command = 'command'
    const cwd = 'cwd'
    const fakeExeca = fake.resolves({ stdout: '', stderr: '' })
    const layer = makeLiveProcess(fakeExeca)

    const effect = Effect.gen(function* () {
      const { exec } = yield* ProcessService
      return yield* exec(command, cwd)
    })

    await Effect.runPromise(
      pipe(
        mapEffError(effect),
        Effect.provide(layer),
        Effect.orDieWith(guardError('An error ocurred'))
      )
    )
    expect(fakeExeca).to.have.been.calledWith(command, { cwd })
  })
})
