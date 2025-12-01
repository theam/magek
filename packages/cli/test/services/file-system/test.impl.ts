import { FileSystemService } from '../../../src/services/file-system/index.js'
import { fake } from 'sinon'
import { fakeService, type FakeOverrides } from '../../helpers/effect.js'

export const makeTestFileSystem = (overrides?: FakeOverrides<FileSystemService>) =>
  fakeService(FileSystemService, {
    readDirectoryContents: fake.returns([]),
    readFileContents: fake.returns('{}'),
    ...overrides,
  })
