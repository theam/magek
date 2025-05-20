import { FileSystemService } from '../../../src/services/file-system'
import { fake } from 'sinon'
import { FakeOverrides, fakeService } from '../../helpers/effect'

export const makeTestFileSystem = (overrides?: FakeOverrides<FileSystemService>) =>
  fakeService(FileSystemService, {
    readDirectoryContents: fake.returns([]),
    readFileContents: fake.returns('{}'),
    ...overrides,
  })
