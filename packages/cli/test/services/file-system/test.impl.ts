import type * as sinon from 'sinon'
import { FileSystemService } from '../../../src/services/file-system/index.js'
import { fake } from 'sinon'
import { Layer } from 'effect'

type FileSystemFakes = {
  readDirectoryContents: sinon.SinonSpy<[string], ReadonlyArray<string> | Promise<ReadonlyArray<string>>>
  readFileContents: sinon.SinonSpy<[string], string | Promise<string>>
}

export const makeTestFileSystem = (overrides?: Partial<FileSystemFakes>) => {
  const fakes: FileSystemFakes = {
    readDirectoryContents: overrides?.readDirectoryContents ?? fake.resolves([]),
    readFileContents: overrides?.readFileContents ?? fake.resolves('{}'),
  }

  const layer = Layer.succeed(FileSystemService, {
    readDirectoryContents: async (directoryPath: string) => fakes.readDirectoryContents(directoryPath),
    readFileContents: async (filePath: string) => fakes.readFileContents(filePath),
  })

  const reset = () => {
    fakes.readDirectoryContents.resetHistory()
    fakes.readFileContents.resetHistory()
  }

  return { layer, fakes, reset }
}
