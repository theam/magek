import * as fs from 'fs'
import { fake, replace } from 'sinon'
import { Effect, pipe } from 'effect'
import { expect } from '../../expect.js'
import { FileSystemService, FileSystemError } from '../../../src/services/file-system/index.js'
import { LiveFileSystem } from '../../../src/services/file-system/live.impl.js'
import { guardError } from '../../../src/common/errors.js'

describe('FileSystem - Live Implementation', () => {
  beforeEach(() => {
    replace(fs.promises, 'readdir', fake.resolves(''))
  })

  it('uses fs.promises.readdir', async () => {
    const directoryPath = 'directoryPath'
    const effect = Effect.gen(function* () {
      const { readDirectoryContents } = yield* FileSystemService
      return yield* Effect.tryPromise({
        try: () => readDirectoryContents(directoryPath),
        catch: (error) => error as FileSystemError,
      })
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
