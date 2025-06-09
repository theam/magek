import * as process from 'process'
import * as execa from 'execa'
import { fake, replace, restore } from 'sinon'
import { Effect, pipe } from 'effect'
import { LiveProcess } from '../../../src/services/process/live.impl'
import { expect } from '../../expect'
import { guardError } from '../../../src/common/errors'
import { ProcessService } from '../../../src/services/process'

describe('Process - Live Implementation', () => {
  beforeEach(() => {
    replace(process, 'cwd', fake.returns(''))
    replace(execa, 'command', fake.resolves({ stdout: '', stderr: '' }))
  })

  afterEach(() => {
    restore()
  })

  const mapEffError = <A, R>(effect: Effect.Effect<A, { error: Error }, R>) =>
    pipe(
      effect,
      Effect.mapError((e) => e.error)
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

    const effect = Effect.gen(function* () {
      const { exec } = yield* ProcessService
      return yield* exec(command, cwd)
    })

    await Effect.runPromise(
      pipe(
        mapEffError(effect),
        Effect.provide(LiveProcess),
        Effect.orDieWith(guardError('An error ocurred'))
      )
    )
    expect(execa.command).to.have.been.calledWith(command, { cwd })
  })
})
