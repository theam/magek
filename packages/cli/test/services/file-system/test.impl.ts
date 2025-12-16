import type * as sinon from 'sinon'
import { FileSystemService } from '../../../src/services/file-system/index.js'
import { fake } from 'sinon'

type FileSystemFakes = {
  readDirectoryContents: sinon.SinonSpy<[string], Promise<ReadonlyArray<string>>>
  readFileContents: sinon.SinonSpy<[string], Promise<string>>
}

export const makeTestFileSystem = (overrides?: Partial<FileSystemFakes>) => {
  const fakes: FileSystemFakes = {
    readDirectoryContents: overrides?.readDirectoryContents ?? fake.resolves([]),
    readFileContents: overrides?.readFileContents ?? fake.resolves('{}'),
  }

  const service: FileSystemService = {
    readDirectoryContents: async (directoryPath: string) => fakes.readDirectoryContents(directoryPath),
    readFileContents: async (filePath: string) => fakes.readFileContents(filePath),
  }

  const reset = () => {
    fakes.readDirectoryContents.resetHistory()
    fakes.readFileContents.resetHistory()
  }

  return { service, fakes, reset }
}
