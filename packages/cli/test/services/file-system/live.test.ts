import * as fs from 'fs'
import { fake, replace } from 'sinon'
import { Effect, pipe } from 'effect'
import { expect } from '../../expect'
import { FileSystemService } from '../../../src/services/file-system'
import { LiveFileSystem } from '../../../src/services/file-system/live.impl'
import { guardError } from '../../../src/common/errors'

describe('FileSystem - Live Implementation', () => {
  beforeEach(() => {
    replace(fs.promises, 'readdir', fake.resolves(''))
  })

  it('uses fs.promises.readdir', async () => {
    const directoryPath = 'directoryPath'
    const effect = Effect.gen(function* () {
      const { readDirectoryContents } = yield* FileSystemService
      return yield* readDirectoryContents(directoryPath)
    })
    await Effect.runPromise(
      pipe(
        effect,
        Effect.mapError((e) => e.error),
        Effect.provide(LiveFileSystem),
        Effect.orDieWith(guardError('An error ocurred'))
      )
    )
    expect(fs.promises.readdir).to.have.been.calledWith(directoryPath)
  })
})
